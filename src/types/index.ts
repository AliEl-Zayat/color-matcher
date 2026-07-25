export type PaintFinish = 'matte' | 'satin' | 'gloss'
export type PaintBaseType = 'opaque' | 'transparent'
export type PaintType =
  | 'automotive_2k'
  | 'automotive_basecoat'
  | 'glc_automotive_pigments'
  | 'glc_inks'
  | 'acrylic_airbrush'
  | 'acrylic_brush'
  | 'lacquer'
  | 'oil'
  | 'watercolor'
  | 'model_color'
  | 'custom'

export type MixingMode = 'acrylic_subtractive' | 'additive'
export type AveragingKernel = 1 | 3 | 5 | 9
export type MaxPaints = 2 | 3 | 4 | 5

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSV {
  h: number
  s: number
  v: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface LAB {
  l: number
  a: number
  b: number
}

export interface Palette {
  id: string
  name: string
  paintType: PaintType
  brand?: string
  defaultThinner?: string
  mixingNotes?: string
  notes?: string
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface Paint {
  id: string
  paletteId: string
  name: string
  brand: string
  finish: PaintFinish
  baseType: PaintBaseType
  rgb: RGB
  hex: string
  lab?: LAB
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface MixComponent {
  paintId: string
  paintName: string
  brand: string
  hex: string
  percent: number
  drops: number
  milliliters: number
  grams: number
}

export interface MixRecipe {
  id: string
  paletteId: string
  paletteName: string
  projectId?: string
  target: {
    rgb: RGB
    hex: string
    hsv: HSV
    hsl: HSL
    lab: LAB
  }
  predicted: {
    rgb: RGB
    hex: string
    lab: LAB
  }
  components: MixComponent[]
  deltaE: number
  matchPercent: number
  mixingMode: MixingMode
  maxPaints: MaxPaints
  imageThumb?: string
  notes?: string
  favorite: boolean
  totalMl: number
  totalDrops: number
  createdAt: number
}

export interface Project {
  id: string
  name: string
  paletteId: string
  notes?: string
  referenceImages: string[]
  recipeIds: string[]
  favoriteRecipeIds: string[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  id: 'settings'
  activePaletteId: string | null
  maxPaints: MaxPaints
  averagingKernel: AveragingKernel
  mixingMode: MixingMode
  prioritizeOpaque: boolean
  prioritizeTransparent: boolean
  totalVolumeMl: number
  totalDrops: number
  dropMl: number
  densityGPerMl: number
}

export interface MixOptions {
  maxPaints: MaxPaints
  lockedPaintIds: string[]
  excludedPaintIds: string[]
  prioritizeOpaque: boolean
  prioritizeTransparent: boolean
  mixingMode: MixingMode
  totalVolumeMl: number
  totalDrops: number
  dropMl: number
  densityGPerMl: number
}

export interface MixResult {
  components: MixComponent[]
  predicted: {
    rgb: RGB
    hex: string
    lab: LAB
  }
  deltaE: number
  matchPercent: number
  mixingMode: MixingMode
}

export const PAINT_TYPE_LABELS: Record<PaintType, string> = {
  automotive_2k: 'Automotive 2K',
  automotive_basecoat: 'Automotive Basecoat',
  glc_automotive_pigments: 'GLC Automotive Pigments',
  glc_inks: 'GLC Inks',
  acrylic_airbrush: 'Acrylic Airbrush',
  acrylic_brush: 'Acrylic Brush Paints',
  lacquer: 'Lacquer Paints',
  oil: 'Oil Paints',
  watercolor: 'Watercolors',
  model_color: 'Model Color',
  custom: 'Custom Palette',
}
