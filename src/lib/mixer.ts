import type {
  MixComponent,
  MixOptions,
  MixResult,
  MixingMode,
  Paint,
  RGB,
} from '@/types'
import {
  deltaE2000,
  describeColor,
  matchPercentFromDeltaE,
  rgbToHex,
  rgbToLab,
} from '@/lib/color'
import { clamp, round } from '@/lib/utils'

function combinations<T>(items: T[], k: number): T[][] {
  if (k <= 0) return [[]]
  if (k > items.length) return []
  const result: T[][] = []
  const walk = (start: number, path: T[]) => {
    if (path.length === k) {
      result.push([...path])
      return
    }
    for (let i = start; i < items.length; i++) {
      const item = items[i]
      if (item === undefined) continue
      path.push(item)
      walk(i + 1, path)
      path.pop()
    }
  }
  walk(0, [])
  return result
}

function srgbToLinear(c: number): number {
  const s = clamp(c / 255, 0, 1)
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c: number): number {
  const v = clamp(c, 0, 1)
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
  return clamp(Math.round(s * 255), 0, 255)
}

/** Kubelka–Munk K/S from linear reflectance. */
function reflectanceToKS(r: number): number {
  const R = clamp(r, 0.0015, 0.999)
  return ((1 - R) * (1 - R)) / (2 * R)
}

function ksToReflectance(ks: number): number {
  const value = ks + 1
  const root = Math.sqrt(Math.max(0, value * value - 1))
  return clamp(value - root, 0.0015, 0.999)
}

function chromaOf(rgb: RGB): number {
  const lab = rgbToLab(rgb)
  return Math.hypot(lab.a, lab.b)
}

function isNearNeutral(rgb: RGB): boolean {
  return chromaOf(rgb) < 12
}

/**
 * Predict mixed color.
 * Acrylic mode uses a Kubelka–Munk-like reflectance blend (much closer to
 * real paint than plain CMY averaging). Additive mode uses linear-light RGB.
 */
export function predictMixColor(
  paints: Paint[],
  weights: number[],
  mode: MixingMode,
): RGB {
  const total = weights.reduce((a, b) => a + b, 0) || 1
  const norms = weights.map((w) => w / total)

  if (mode === 'additive') {
    const r = paints.reduce((s, p, i) => s + srgbToLinear(p.rgb.r) * (norms[i] ?? 0), 0)
    const g = paints.reduce((s, p, i) => s + srgbToLinear(p.rgb.g) * (norms[i] ?? 0), 0)
    const b = paints.reduce((s, p, i) => s + srgbToLinear(p.rgb.b) * (norms[i] ?? 0), 0)
    return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) }
  }

  const ks = paints.reduce(
    (acc, paint, i) => {
      const w = norms[i] ?? 0
      return {
        r: acc.r + reflectanceToKS(srgbToLinear(paint.rgb.r)) * w,
        g: acc.g + reflectanceToKS(srgbToLinear(paint.rgb.g)) * w,
        b: acc.b + reflectanceToKS(srgbToLinear(paint.rgb.b)) * w,
      }
    },
    { r: 0, g: 0, b: 0 },
  )

  return {
    r: linearToSrgb(ksToReflectance(ks.r)),
    g: linearToSrgb(ksToReflectance(ks.g)),
    b: linearToSrgb(ksToReflectance(ks.b)),
  }
}

function scoreMix(
  predicted: RGB,
  targetLab: ReturnType<typeof rgbToLab>,
  targetChroma: number,
  paints: Paint[],
  weights: number[],
  options: MixOptions,
): number {
  const predLab = rgbToLab(predicted)
  let score = deltaE2000(predLab, targetLab)

  // Prefer chromatic paints when the target is colorful (avoid B/W-only traps)
  if (targetChroma > 18) {
    const neutralShare = paints.reduce((sum, p, i) => {
      return sum + (isNearNeutral(p.rgb) ? (weights[i] ?? 0) : 0)
    }, 0)
    score += neutralShare * Math.min(8, targetChroma / 8)
  }

  if (options.prioritizeOpaque) {
    const opaqueShare = paints.reduce((sum, p, i) => {
      return sum + (p.baseType === 'opaque' ? (weights[i] ?? 0) : 0)
    }, 0)
    score -= opaqueShare * 0.12
  }
  if (options.prioritizeTransparent) {
    const transparentShare = paints.reduce((sum, p, i) => {
      return sum + (p.baseType === 'transparent' ? (weights[i] ?? 0) : 0)
    }, 0)
    score -= transparentShare * 0.12
  }
  return score
}

function optimizeWeights(
  paints: Paint[],
  targetRgb: RGB,
  options: MixOptions,
): { weights: number[]; deltaE: number; predicted: RGB } {
  const targetLab = rgbToLab(targetRgb)
  const targetChroma = Math.hypot(targetLab.a, targetLab.b)
  const n = paints.length

  if (n === 1) {
    const predicted = paints[0]!.rgb
    return {
      weights: [1],
      predicted,
      deltaE: deltaE2000(rgbToLab(predicted), targetLab),
    }
  }

  let bestWeights = Array.from({ length: n }, () => 1 / n)
  let bestPredicted = predictMixColor(paints, bestWeights, options.mixingMode)
  let bestScore = scoreMix(
    bestPredicted,
    targetLab,
    targetChroma,
    paints,
    bestWeights,
    options,
  )

  // Finer simplex grid for small sets
  const steps = n <= 2 ? 24 : n === 3 ? 16 : n === 4 ? 12 : 9
  const coords: number[][] = []
  const recurse = (remaining: number, left: number, path: number[]) => {
    if (remaining === 1) {
      coords.push([...path, left])
      return
    }
    for (let i = 0; i <= left; i++) {
      recurse(remaining - 1, left - i, [...path, i])
    }
  }
  recurse(n, steps, [])

  for (const c of coords) {
    const sum = c.reduce((a, b) => a + b, 0)
    if (sum === 0) continue
    // Prefer recipes that actually use every selected paint a bit
    if (c.some((v) => v === 0) && n > 2) continue
    const weights = c.map((v) => v / sum)
    const predicted = predictMixColor(paints, weights, options.mixingMode)
    const sc = scoreMix(
      predicted,
      targetLab,
      targetChroma,
      paints,
      weights,
      options,
    )
    if (sc < bestScore) {
      bestScore = sc
      bestWeights = weights
      bestPredicted = predicted
    }
  }

  // Local coordinate descent on ΔE
  for (let iter = 0; iter < 24; iter++) {
    let improved = false
    for (let i = 0; i < n; i++) {
      for (const delta of [-0.08, -0.04, -0.02, -0.01, 0.01, 0.02, 0.04, 0.08]) {
        const next = [...bestWeights]
        next[i] = Math.max(0, (next[i] ?? 0) + delta)
        const total = next.reduce((a, b) => a + b, 0)
        if (total <= 0) continue
        const norms = next.map((w) => w / total)
        const predicted = predictMixColor(paints, norms, options.mixingMode)
        const sc = scoreMix(
          predicted,
          targetLab,
          targetChroma,
          paints,
          norms,
          options,
        )
        if (sc < bestScore - 0.0005) {
          bestScore = sc
          bestWeights = norms
          bestPredicted = predicted
          improved = true
        }
      }
    }
    if (!improved) break
  }

  return {
    weights: bestWeights,
    predicted: bestPredicted,
    deltaE: deltaE2000(rgbToLab(bestPredicted), targetLab),
  }
}

function toComponents(
  paints: Paint[],
  weights: number[],
  options: MixOptions,
): MixComponent[] {
  const cleaned = paints
    .map((paint, i) => ({ paint, weight: weights[i] ?? 0 }))
    .filter((x) => x.weight >= 0.005)
  const total = cleaned.reduce((s, x) => s + x.weight, 0) || 1

  return cleaned
    .map(({ paint, weight }) => {
      const percent = (weight / total) * 100
      const milliliters = round((percent / 100) * options.totalVolumeMl, 2)
      const drops = Math.max(
        1,
        Math.round((percent / 100) * options.totalDrops),
      )
      const grams = round(milliliters * options.densityGPerMl, 2)
      return {
        paintId: paint.id,
        paintName: paint.name,
        brand: paint.brand,
        hex: paint.hex,
        percent: round(percent, 1),
        drops,
        milliliters,
        grams,
      }
    })
    .sort((a, b) => b.percent - a.percent)
}

/** Build a smarter candidate pool than "nearest RGB only". */
function selectCandidatePaints(
  available: Paint[],
  locked: Paint[],
  targetRgb: RGB,
): Paint[] {
  const targetLab = rgbToLab(targetRgb)
  const targetChroma = Math.hypot(targetLab.a, targetLab.b)
  const free = available.filter((p) => !locked.some((l) => l.id === p.id))

  const byDeltaE = [...free]
    .map((p) => ({
      paint: p,
      d: deltaE2000(p.lab ?? rgbToLab(p.rgb), targetLab),
      chroma: chromaOf(p.rgb),
    }))
    .sort((a, b) => a.d - b.d)

  const nearest = byDeltaE.slice(0, 10).map((x) => x.paint)

  // Chromatic helpers toward target hue (critical vs Golden-style mixers)
  const chromatic = byDeltaE
    .filter((x) => x.chroma > 18)
    .slice(0, 8)
    .map((x) => x.paint)

  // Axis helpers: closest on L*, a*, b* independently
  const byL = [...free].sort(
    (a, b) =>
      Math.abs((a.lab ?? rgbToLab(a.rgb)).l - targetLab.l) -
      Math.abs((b.lab ?? rgbToLab(b.rgb)).l - targetLab.l),
  )
  const byA = [...free].sort(
    (a, b) =>
      Math.abs((a.lab ?? rgbToLab(a.rgb)).a - targetLab.a) -
      Math.abs((b.lab ?? rgbToLab(b.rgb)).a - targetLab.a),
  )
  const byB = [...free].sort(
    (a, b) =>
      Math.abs((a.lab ?? rgbToLab(a.rgb)).b - targetLab.b) -
      Math.abs((b.lab ?? rgbToLab(b.rgb)).b - targetLab.b),
  )

  const axisHelpers = [byL[0], byA[0], byB[0], byL[1], byA[1], byB[1]].filter(
    (p): p is Paint => Boolean(p),
  )

  // Keep a white/black only if target is low chroma or needs value control
  const neutrals = free.filter((p) => isNearNeutral(p.rgb))
  const white = neutrals
    .filter((p) => p.rgb.r + p.rgb.g + p.rgb.b > 540)
    .sort((a, b) => b.rgb.r + b.rgb.g + b.rgb.b - (a.rgb.r + a.rgb.g + a.rgb.b))[0]
  const black = neutrals
    .filter((p) => p.rgb.r + p.rgb.g + p.rgb.b < 120)
    .sort((a, b) => a.rgb.r + a.rgb.g + a.rgb.b - (b.rgb.r + b.rgb.g + b.rgb.b))[0]

  const picked = new Map<string, Paint>()
  for (const p of [
    ...locked,
    ...nearest,
    ...chromatic,
    ...axisHelpers,
    ...(targetChroma < 25 || targetLab.l > 70 ? (white ? [white] : []) : []),
    ...(targetChroma < 25 || targetLab.l < 35 ? (black ? [black] : []) : []),
    // Always allow one white for tinting if present
    ...(white ? [white] : []),
  ]) {
    picked.set(p.id, p)
  }

  // Cap pool size for combinatorics, prioritizing chromatic when target is rich
  const list = [...picked.values()]
  if (list.length <= 14) return list

  return list
    .map((p) => {
      const d = deltaE2000(p.lab ?? rgbToLab(p.rgb), targetLab)
      const chromaBonus = targetChroma > 18 && !isNearNeutral(p.rgb) ? -4 : 0
      return { p, rank: d + chromaBonus }
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 14)
    .map((x) => x.p)
}

export function findBestMix(
  targetRgb: RGB,
  palettePaints: Paint[],
  options: MixOptions,
): MixResult | null {
  const locked = palettePaints.filter((p) =>
    options.lockedPaintIds.includes(p.id),
  )
  const available = palettePaints.filter(
    (p) => !options.excludedPaintIds.includes(p.id),
  )

  const freePool = selectCandidatePaints(available, locked, targetRgb).filter(
    (p) => !locked.some((l) => l.id === p.id),
  )
  const pool = [...locked, ...freePool]
  if (pool.length === 0) return null

  let best: {
    paints: Paint[]
    weights: number[]
    predicted: RGB
    deltaE: number
  } | null = null

  const minSize = Math.max(1, locked.length || 1)
  const maxSize = Math.min(options.maxPaints, pool.length)

  for (let size = minSize; size <= maxSize; size++) {
    const freeSlots = size - locked.length
    if (freeSlots < 0) continue
    const freeCombos =
      freeSlots === 0 ? [[]] : combinations(freePool, freeSlots)

    for (const combo of freeCombos) {
      const paints = [...locked, ...combo]
      if (paints.length === 0) continue
      const optimized = optimizeWeights(paints, targetRgb, options)
      if (!best || optimized.deltaE < best.deltaE - 0.01) {
        best = {
          paints,
          weights: optimized.weights,
          predicted: optimized.predicted,
          deltaE: optimized.deltaE,
        }
      }
    }
  }

  if (!best) return null

  const components = toComponents(best.paints, best.weights, options)
  const predictedHex = rgbToHex(best.predicted)
  return {
    components,
    predicted: {
      rgb: best.predicted,
      hex: predictedHex,
      lab: rgbToLab(best.predicted),
    },
    deltaE: best.deltaE,
    matchPercent: matchPercentFromDeltaE(best.deltaE),
    mixingMode: options.mixingMode,
  }
}

export function scaleRecipe(
  components: MixComponent[],
  totalVolumeMl: number,
  totalDrops: number,
  densityGPerMl: number,
): MixComponent[] {
  return components.map((c) => {
    const milliliters = round((c.percent / 100) * totalVolumeMl, 2)
    const drops = Math.max(1, Math.round((c.percent / 100) * totalDrops))
    return {
      ...c,
      milliliters,
      drops,
      grams: round(milliliters * densityGPerMl, 2),
    }
  })
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

/**
 * Scale a recipe to the smallest practical drop-based sample.
 * The least-used paint becomes 1 drop; others keep approximate ratios.
 */
export function toMinimumSampleRecipe(
  components: MixComponent[],
  dropMl: number,
  densityGPerMl: number,
): MixComponent[] {
  if (components.length === 0) return []

  const minPercent = Math.min(...components.map((c) => c.percent))
  if (minPercent <= 0) {
    return components.map((c) => ({
      ...c,
      drops: 1,
      milliliters: round(dropMl, 3),
      grams: round(dropMl * densityGPerMl, 3),
    }))
  }

  let parts = components.map((c) => Math.max(1, Math.round(c.percent / minPercent)))
  const divisor = parts.reduce((acc, n) => gcd(acc, n), parts[0] ?? 1)
  parts = parts.map((n) => Math.max(1, Math.round(n / divisor)))

  return components.map((c, i) => {
    const drops = parts[i] ?? 1
    const milliliters = round(drops * dropMl, 3)
    return {
      ...c,
      drops,
      milliliters,
      grams: round(milliliters * densityGPerMl, 3),
    }
  })
}

export function buildTargetSnapshot(rgb: RGB) {
  return describeColor(rgb)
}
