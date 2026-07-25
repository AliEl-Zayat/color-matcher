import Color from 'colorjs.io'
import type { HSL, HSV, LAB, RGB } from '@/types'
import { clamp, round } from '@/lib/utils'

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '').trim()
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const int = Number.parseInt(full, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h: round(h, 1), s: round(s * 100, 1), v: round(max * 100, 1) }
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const S = s / 100
  const V = v / 100
  const C = V * S
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = V - C
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) [rp, gp, bp] = [C, X, 0]
  else if (h < 120) [rp, gp, bp] = [X, C, 0]
  else if (h < 180) [rp, gp, bp] = [0, C, X]
  else if (h < 240) [rp, gp, bp] = [0, X, C]
  else if (h < 300) [rp, gp, bp] = [X, 0, C]
  else [rp, gp, bp] = [C, 0, X]
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: round(h, 1), s: round(s * 100, 1), l: round(l * 100, 1) }
}

export function rgbToLab(rgb: RGB): LAB {
  const color = new Color('srgb', [rgb.r / 255, rgb.g / 255, rgb.b / 255])
  const [l, a, b] = color.to('lab').coords
  return {
    l: round(l ?? 0, 2),
    a: round(a ?? 0, 2),
    b: round(b ?? 0, 2),
  }
}

export function labToRgb(lab: LAB): RGB {
  const color = new Color('lab', [lab.l, lab.a, lab.b])
  const [r, g, b] = color.to('srgb').coords
  return {
    r: clamp(Math.round((r ?? 0) * 255), 0, 255),
    g: clamp(Math.round((g ?? 0) * 255), 0, 255),
    b: clamp(Math.round((b ?? 0) * 255), 0, 255),
  }
}

export function deltaE2000(a: LAB, b: LAB): number {
  const c1 = new Color('lab', [a.l, a.a, a.b])
  const c2 = new Color('lab', [b.l, b.a, b.b])
  return round(c1.deltaE(c2, '2000'), 2)
}

export function matchPercentFromDeltaE(deltaE: number): number {
  // Soft perceptual mapping: ΔE 0 → 100%, ΔE ≥ 20 → ~0%
  const pct = 100 * Math.exp(-deltaE / 6.5)
  return round(clamp(pct, 0, 100), 1)
}

export function describeColor(rgb: RGB) {
  const hex = rgbToHex(rgb)
  return {
    rgb,
    hex,
    hsv: rgbToHsv(rgb),
    hsl: rgbToHsl(rgb),
    lab: rgbToLab(rgb),
  }
}

export function averageRgb(samples: RGB[]): RGB {
  if (samples.length === 0) return { r: 0, g: 0, b: 0 }
  const sum = samples.reduce(
    (acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b }),
    { r: 0, g: 0, b: 0 },
  )
  return {
    r: Math.round(sum.r / samples.length),
    g: Math.round(sum.g / samples.length),
    b: Math.round(sum.b / samples.length),
  }
}

/** Sample average color from ImageData around a point. */
export function sampleImageData(
  imageData: ImageData,
  x: number,
  y: number,
  kernel: number,
): RGB {
  const half = Math.floor(kernel / 2)
  const samples: RGB[] = []
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const px = clamp(Math.round(x + dx), 0, imageData.width - 1)
      const py = clamp(Math.round(y + dy), 0, imageData.height - 1)
      const i = (py * imageData.width + px) * 4
      samples.push({
        r: imageData.data[i] ?? 0,
        g: imageData.data[i + 1] ?? 0,
        b: imageData.data[i + 2] ?? 0,
      })
    }
  }
  return averageRgb(samples)
}

export function contrastText(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? '#0b0f14' : '#f4f7fb'
}
