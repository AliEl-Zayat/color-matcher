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

function rgbToCmy(rgb: RGB) {
  return {
    c: 1 - rgb.r / 255,
    m: 1 - rgb.g / 255,
    y: 1 - rgb.b / 255,
  }
}

function cmyToRgb(cmy: { c: number; m: number; y: number }): RGB {
  return {
    r: clamp(Math.round((1 - cmy.c) * 255), 0, 255),
    g: clamp(Math.round((1 - cmy.m) * 255), 0, 255),
    b: clamp(Math.round((1 - cmy.y) * 255), 0, 255),
  }
}

export function predictMixColor(
  paints: Paint[],
  weights: number[],
  mode: MixingMode,
): RGB {
  const total = weights.reduce((a, b) => a + b, 0) || 1
  const norms = weights.map((w) => w / total)

  if (mode === 'additive') {
    return {
      r: clamp(
        Math.round(paints.reduce((s, p, i) => s + p.rgb.r * (norms[i] ?? 0), 0)),
        0,
        255,
      ),
      g: clamp(
        Math.round(paints.reduce((s, p, i) => s + p.rgb.g * (norms[i] ?? 0), 0)),
        0,
        255,
      ),
      b: clamp(
        Math.round(paints.reduce((s, p, i) => s + p.rgb.b * (norms[i] ?? 0), 0)),
        0,
        255,
      ),
    }
  }

  // Acrylic / pigment-like subtractive approximation in CMY
  const mixed = paints.reduce(
    (acc, paint, i) => {
      const w = norms[i] ?? 0
      const cmy = rgbToCmy(paint.rgb)
      return {
        c: acc.c + cmy.c * w,
        m: acc.m + cmy.m * w,
        y: acc.y + cmy.y * w,
      }
    },
    { c: 0, m: 0, y: 0 },
  )
  return cmyToRgb(mixed)
}

function scoreMix(
  predicted: RGB,
  targetLab: ReturnType<typeof rgbToLab>,
  paints: Paint[],
  weights: number[],
  options: MixOptions,
): number {
  const predLab = rgbToLab(predicted)
  let score = deltaE2000(predLab, targetLab)

  if (options.prioritizeOpaque) {
    const opaqueShare = paints.reduce((sum, p, i) => {
      return sum + (p.baseType === 'opaque' ? (weights[i] ?? 0) : 0)
    }, 0)
    score -= opaqueShare * 0.15
  }
  if (options.prioritizeTransparent) {
    const transparentShare = paints.reduce((sum, p, i) => {
      return sum + (p.baseType === 'transparent' ? (weights[i] ?? 0) : 0)
    }, 0)
    score -= transparentShare * 0.15
  }
  return score
}

function optimizeWeights(
  paints: Paint[],
  targetRgb: RGB,
  options: MixOptions,
): { weights: number[]; deltaE: number; predicted: RGB } {
  const targetLab = rgbToLab(targetRgb)
  const n = paints.length
  let bestWeights = Array.from({ length: n }, () => 1 / n)
  let bestPredicted = predictMixColor(paints, bestWeights, options.mixingMode)
  let bestScore = scoreMix(bestPredicted, targetLab, paints, bestWeights, options)

  if (n === 1) {
    const predicted = paints[0]!.rgb
    return {
      weights: [1],
      predicted,
      deltaE: deltaE2000(rgbToLab(predicted), targetLab),
    }
  }

  // Coarse simplex-style / grid refinement
  const steps = n <= 3 ? 11 : n === 4 ? 9 : 7
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
    const weights = c.map((v) => v / sum)
    // Skip near-zero components for cleaner recipes when optional
    const predicted = predictMixColor(paints, weights, options.mixingMode)
    const sc = scoreMix(predicted, targetLab, paints, weights, options)
    if (sc < bestScore) {
      bestScore = sc
      bestWeights = weights
      bestPredicted = predicted
    }
  }

  // Local refinement around best (±5%)
  for (let iter = 0; iter < 8; iter++) {
    let improved = false
    for (let i = 0; i < n; i++) {
      for (const delta of [-0.04, -0.02, 0.02, 0.04]) {
        const next = [...bestWeights]
        next[i] = Math.max(0, (next[i] ?? 0) + delta)
        const total = next.reduce((a, b) => a + b, 0)
        if (total <= 0) continue
        const norms = next.map((w) => w / total)
        const predicted = predictMixColor(paints, norms, options.mixingMode)
        const sc = scoreMix(predicted, targetLab, paints, norms, options)
        if (sc < bestScore - 0.001) {
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

export function findBestMix(
  targetRgb: RGB,
  palettePaints: Paint[],
  options: MixOptions,
): MixResult | null {
  const locked = palettePaints.filter((p) =>
    options.lockedPaintIds.includes(p.id),
  )
  const available = palettePaints.filter(
    (p) =>
      !options.excludedPaintIds.includes(p.id) &&
      (options.lockedPaintIds.length === 0 ||
        options.lockedPaintIds.includes(p.id) ||
        !options.lockedPaintIds.includes(p.id)),
  )

  // Candidate pool: locked paints must be included; others ranked by ΔE
  const targetLab = rgbToLab(targetRgb)
  const free = available
    .filter((p) => !options.lockedPaintIds.includes(p.id))
    .map((p) => ({
      paint: p,
      d: deltaE2000(p.lab ?? rgbToLab(p.rgb), targetLab),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 12)
    .map((x) => x.paint)

  const pool = [...locked, ...free.filter((p) => !locked.some((l) => l.id === p.id))]
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
      freeSlots === 0
        ? [[]]
        : combinations(
            free.filter((p) => !locked.some((l) => l.id === p.id)),
            freeSlots,
          )

    for (const combo of freeCombos) {
      const paints = [...locked, ...combo]
      if (paints.length === 0) continue
      const optimized = optimizeWeights(paints, targetRgb, options)
      if (!best || optimized.deltaE < best.deltaE) {
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
