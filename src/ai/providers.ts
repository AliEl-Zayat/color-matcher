/**
 * Reserved architecture for future AI / brand conversion features.
 * No network calls are made in v1 — everything remains local.
 */

export type BrandCatalog =
  | 'vallejo'
  | 'citadel'
  | 'ak'
  | 'army_painter'
  | 'ral'
  | 'pantone'
  | 'ncs'

export interface BrandMatchRequest {
  targetHex: string
  catalog: BrandCatalog
  limit?: number
}

export interface BrandMatchResult {
  catalog: BrandCatalog
  name: string
  code?: string
  hex: string
  deltaE: number
}

export interface AiPaintPredictionRequest {
  imageDataUrl: string
  paletteId: string
  notes?: string
}

export interface FutureAiProvider {
  id: string
  label: string
  predictPaint?(request: AiPaintPredictionRequest): Promise<unknown>
  matchBrand?(request: BrandMatchRequest): Promise<BrandMatchResult[]>
}

/** Placeholder providers — wire real models/APIs later. */
export const futureAiProviders: FutureAiProvider[] = [
  { id: 'local-heuristic', label: 'Local Heuristic (active)' },
  { id: 'ai-paint-prediction', label: 'AI Paint Prediction (reserved)' },
  { id: 'brand-matching', label: 'Brand Matching (reserved)' },
  { id: 'vallejo-conversion', label: 'Vallejo Conversion (reserved)' },
  { id: 'citadel-conversion', label: 'Citadel Conversion (reserved)' },
  { id: 'ak-conversion', label: 'AK Conversion (reserved)' },
  { id: 'army-painter-conversion', label: 'Army Painter Conversion (reserved)' },
  { id: 'ral-matching', label: 'RAL Matching (reserved)' },
  { id: 'pantone-matching', label: 'Pantone Matching (reserved)' },
  { id: 'ncs-matching', label: 'NCS Matching (reserved)' },
]

export function listFutureAiFeatures(): string[] {
  return futureAiProviders.map((p) => p.label)
}
