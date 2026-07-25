import type { RGB } from '@/types'
import { averageRgb, deltaE2000, rgbToLab } from '@/lib/color'
import { clamp, uid } from '@/lib/utils'

export interface ExtractedSwatch {
  id: string
  rgb: RGB
  hex: string
  population: number
  /** Share of sampled pixels (0–1). */
  coverage: number
}

export interface ExtractPaletteOptions {
  /** Number of colors to extract (3–12). */
  count: number
  /** Max pixels to sample for clustering. */
  maxSamples?: number
  /** Merge colors closer than this ΔE. */
  mergeDeltaE?: number
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

function distLab(a: RGB, b: RGB): number {
  return deltaE2000(rgbToLab(a), rgbToLab(b))
}

function samplePixels(imageData: ImageData, maxSamples: number): RGB[] {
  const { data, width, height } = imageData
  const total = width * height
  const step = Math.max(1, Math.floor(total / maxSamples))
  const samples: RGB[] = []

  for (let i = 0; i < total; i += step) {
    const idx = i * 4
    const a = data[idx + 3] ?? 0
    if (a < 200) continue
    const r = data[idx] ?? 0
    const g = data[idx + 1] ?? 0
    const b = data[idx + 2] ?? 0
    // Skip near-white / near-black extremes lightly so mid tones get room,
    // but still keep them if they dominate later via coverage sorting.
    samples.push({ r, g, b })
    if (samples.length >= maxSamples) break
  }
  return samples
}

function initCentroids(samples: RGB[], k: number): RGB[] {
  if (samples.length === 0) return []
  const centroids: RGB[] = []
  // First: pick a random seed, then farthest-point sampling in LAB ΔE
  const first = samples[Math.floor(Math.random() * samples.length)]!
  centroids.push(first)

  while (centroids.length < k && centroids.length < samples.length) {
    let best: RGB | null = null
    let bestDist = -1
    // Sample a subset for speed
    const stride = Math.max(1, Math.floor(samples.length / 400))
    for (let i = 0; i < samples.length; i += stride) {
      const s = samples[i]!
      let minD = Infinity
      for (const c of centroids) {
        minD = Math.min(minD, distLab(s, c))
      }
      if (minD > bestDist) {
        bestDist = minD
        best = s
      }
    }
    if (!best) break
    centroids.push(best)
  }
  return centroids
}

function kMeans(samples: RGB[], k: number, iterations = 12): {
  centroids: RGB[]
  counts: number[]
} {
  if (samples.length === 0) return { centroids: [], counts: [] }
  const count = Math.min(k, samples.length)
  let centroids = initCentroids(samples, count)
  let assignments = new Array<number>(samples.length).fill(0)

  for (let iter = 0; iter < iterations; iter++) {
    // Assign
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const d = distLab(s, centroids[c]!)
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      assignments[i] = best
    }

    // Update
    const buckets: RGB[][] = Array.from({ length: centroids.length }, () => [])
    for (let i = 0; i < samples.length; i++) {
      buckets[assignments[i]!]!.push(samples[i]!)
    }
    centroids = centroids.map((prev, i) => {
      const bucket = buckets[i]!
      return bucket.length ? averageRgb(bucket) : prev
    })
  }

  const counts = new Array<number>(centroids.length).fill(0)
  for (const a of assignments) counts[a] = (counts[a] ?? 0) + 1

  return { centroids, counts }
}

function mergeClose(
  swatches: ExtractedSwatch[],
  mergeDeltaE: number,
): ExtractedSwatch[] {
  const sorted = [...swatches].sort((a, b) => b.population - a.population)
  const kept: ExtractedSwatch[] = []

  for (const s of sorted) {
    const near = kept.find((k) => distLab(k.rgb, s.rgb) < mergeDeltaE)
    if (!near) {
      kept.push(s)
      continue
    }
    const total = near.population + s.population
    const mergedRgb = averageRgb([
      ...Array.from({ length: Math.max(1, Math.round(near.population / 20)) }, () => near.rgb),
      ...Array.from({ length: Math.max(1, Math.round(s.population / 20)) }, () => s.rgb),
    ])
    near.rgb = mergedRgb
    near.hex = rgbToHex(mergedRgb)
    near.population = total
  }

  const totalPop = kept.reduce((sum, s) => sum + s.population, 0) || 1
  return kept
    .map((s) => ({ ...s, coverage: s.population / totalPop }))
    .sort((a, b) => b.population - a.population)
}

/** Extract a palette of dominant colors from ImageData. */
export function extractPaletteFromImageData(
  imageData: ImageData,
  options: ExtractPaletteOptions,
): ExtractedSwatch[] {
  const count = clamp(options.count, 2, 12)
  const maxSamples = options.maxSamples ?? 4000
  const mergeDeltaE = options.mergeDeltaE ?? 8

  const samples = samplePixels(imageData, maxSamples)
  if (samples.length === 0) return []

  // Over-cluster then merge for cleaner palettes
  const { centroids, counts } = kMeans(samples, Math.min(count + 2, 14))
  const raw: ExtractedSwatch[] = centroids.map((rgb, i) => ({
    id: uid('swatch'),
    rgb,
    hex: rgbToHex(rgb),
    population: counts[i] ?? 0,
    coverage: 0,
  }))

  const merged = mergeClose(
    raw.filter((s) => s.population > 0),
    mergeDeltaE,
  )
  return merged.slice(0, count)
}

/** Load an image URL onto a canvas and extract a palette. */
export async function extractPaletteFromImageUrl(
  imageUrl: string,
  options: ExtractPaletteOptions,
): Promise<ExtractedSwatch[]> {
  const img = await loadImage(imageUrl)
  const maxEdge = 640
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, w, h)
  return extractPaletteFromImageData(ctx.getImageData(0, 0, w, h), options)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export function createSwatchFromRgb(rgb: RGB): ExtractedSwatch {
  return {
    id: uid('swatch'),
    rgb,
    hex: rgbToHex(rgb),
    population: 1,
    coverage: 0,
  }
}
