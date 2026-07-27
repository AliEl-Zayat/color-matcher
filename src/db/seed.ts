import type { PaintMatchDB } from '@/db'
import { rgbToHex, rgbToLab } from '@/lib/color'
import { uid } from '@/lib/utils'
import {
  PAINT_TYPE_LABELS,
  STARTER_KIT_TYPES,
  type Paint,
  type PaintType,
  type Palette,
  type RGB,
} from '@/types'

type KitBuild = { palette: Palette; paints: Paint[] }

function paint(
  paletteId: string,
  name: string,
  brand: string,
  rgb: RGB,
  finish: Paint['finish'] = 'matte',
  baseType: Paint['baseType'] = 'opaque',
  notes?: string,
): Paint {
  const now = Date.now()
  return {
    id: uid('paint'),
    paletteId,
    name,
    brand,
    finish,
    baseType,
    rgb,
    hex: rgbToHex(rgb),
    lab: rgbToLab(rgb),
    notes,
    createdAt: now,
    updatedAt: now,
  }
}

function makePalette(
  now: number,
  name: string,
  paintType: PaintType,
  brand: string,
  defaultThinner: string,
  mixingNotes: string,
  notes: string,
): Palette {
  return {
    id: uid('palette'),
    name,
    paintType,
    brand,
    defaultThinner,
    mixingNotes,
    notes,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
}

function buildAutomotive2k(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Automotive 2K Kit',
    'automotive_2k',
    '2K Shop',
    '2K hardener / thinner',
    'Only mix within the same 2K system. Observe pot life after catalyzing.',
    'Starter 2K automotive kit — sample your real tints.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', '2K Shop', { r: 250, g: 250, b: 248 }, 'gloss'),
      paint(palette.id, 'Black', '2K Shop', { r: 14, g: 14, b: 16 }, 'gloss'),
      paint(palette.id, 'Yellow', '2K Shop', { r: 236, g: 198, b: 42 }, 'gloss'),
      paint(palette.id, 'Red', '2K Shop', { r: 188, g: 28, b: 36 }, 'gloss'),
      paint(palette.id, 'Blue', '2K Shop', { r: 28, g: 72, b: 168 }, 'gloss'),
      paint(palette.id, 'Green', '2K Shop', { r: 24, g: 128, b: 78 }, 'gloss'),
      paint(palette.id, 'Orange', '2K Shop', { r: 228, g: 108, b: 32 }, 'gloss'),
      paint(palette.id, 'Pearl Silver', '2K Shop', { r: 186, g: 190, b: 196 }, 'gloss', 'transparent'),
    ],
  }
}

function buildAutomotiveBasecoat(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Automotive Basecoat Kit',
    'automotive_basecoat',
    'Shop',
    'Basecoat thinner',
    'Shake well. Mix by weight when possible.',
    'Compatible basecoat system only.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', 'Shop', { r: 250, g: 250, b: 248 }, 'gloss'),
      paint(palette.id, 'Black', 'Shop', { r: 18, g: 18, b: 20 }, 'gloss'),
      paint(palette.id, 'Warm Brown', 'Shop', { r: 120, g: 78, b: 48 }, 'satin'),
      paint(palette.id, 'Yellow Oxide', 'Shop', { r: 210, g: 160, b: 50 }, 'satin'),
      paint(palette.id, 'Scarlet', 'Shop', { r: 190, g: 40, b: 45 }, 'satin'),
      paint(palette.id, 'Silver', 'Shop', { r: 180, g: 185, b: 190 }, 'gloss', 'transparent'),
    ],
  }
}

function buildGlcAutomotive(now: number): KitBuild {
  const palette = makePalette(
    now,
    'GLC Automotive Pigments',
    'glc_automotive_pigments',
    'GLC',
    'GLC binder / system reducer',
    'Mix only GLC automotive pigments together in compatible binder. Prefer weight ratios.',
    'Starter GLC automotive pigment kit — replace with real bottle samples.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', 'GLC', { r: 248, g: 248, b: 246 }, 'gloss'),
      paint(palette.id, 'Black', 'GLC', { r: 16, g: 16, b: 18 }, 'gloss'),
      paint(palette.id, 'Yellow Oxide', 'GLC', { r: 214, g: 162, b: 48 }, 'satin'),
      paint(palette.id, 'Red Oxide', 'GLC', { r: 158, g: 52, b: 38 }, 'satin'),
      paint(palette.id, 'Scarlet', 'GLC', { r: 196, g: 36, b: 42 }, 'satin'),
      paint(palette.id, 'Phthalo Blue', 'GLC', { r: 18, g: 58, b: 148 }, 'satin', 'transparent'),
      paint(palette.id, 'Phthalo Green', 'GLC', { r: 12, g: 110, b: 88 }, 'satin', 'transparent'),
      paint(palette.id, 'Violet', 'GLC', { r: 92, g: 42, b: 128 }, 'satin', 'transparent'),
      paint(palette.id, 'Orange', 'GLC', { r: 230, g: 110, b: 36 }, 'satin'),
      paint(palette.id, 'Metallic Silver', 'GLC', { r: 178, g: 182, b: 188 }, 'gloss', 'transparent'),
    ],
  }
}

function buildGlcInks(now: number): KitBuild {
  const palette = makePalette(
    now,
    'GLC Inks Kit',
    'glc_inks',
    'GLC',
    'GLC ink reducer',
    'GLC inks are a separate system — do not mix with automotive pigments.',
    'Starter GLC ink kit — sample your real inks for production matching.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'Ink White', 'GLC', { r: 250, g: 250, b: 248 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Black', 'GLC', { r: 12, g: 12, b: 14 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Yellow', 'GLC', { r: 245, g: 205, b: 40 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Magenta', 'GLC', { r: 196, g: 28, b: 96 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Cyan', 'GLC', { r: 0, g: 156, b: 210 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Orange', 'GLC', { r: 238, g: 96, b: 32 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Violet', 'GLC', { r: 108, g: 36, b: 156 }, 'gloss', 'transparent'),
      paint(palette.id, 'Ink Green', 'GLC', { r: 20, g: 150, b: 92 }, 'gloss', 'transparent'),
    ],
  }
}

function buildAcrylicAirbrush(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Acrylic Airbrush Kit',
    'acrylic_airbrush',
    'Airbrush',
    'Airbrush thinner',
    'Thin ~1:1 to 2:1 paint:thinner. Mix only airbrush-compatible acrylics.',
    'Starter acrylic airbrush kit.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', 'Airbrush', { r: 244, g: 244, b: 242 }, 'matte'),
      paint(palette.id, 'Black', 'Airbrush', { r: 20, g: 20, b: 22 }, 'matte'),
      paint(palette.id, 'Primary Yellow', 'Airbrush', { r: 246, g: 210, b: 36 }, 'matte'),
      paint(palette.id, 'Primary Red', 'Airbrush', { r: 198, g: 32, b: 48 }, 'matte'),
      paint(palette.id, 'Primary Blue', 'Airbrush', { r: 36, g: 78, b: 186 }, 'matte'),
      paint(palette.id, 'Transparent Smoke', 'Airbrush', { r: 72, g: 72, b: 76 }, 'satin', 'transparent'),
      paint(palette.id, 'Fluorescent Orange', 'Airbrush', { r: 255, g: 96, b: 20 }, 'satin', 'transparent'),
      paint(palette.id, 'Candy Teal', 'Airbrush', { r: 12, g: 148, b: 148 }, 'gloss', 'transparent'),
    ],
  }
}

function buildAcrylicBrush(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Acrylic Brush Kit',
    'acrylic_brush',
    'Studio',
    'Water',
    'Mix thoroughly on a wet palette.',
    'Starter acrylic brush kit.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', 'Studio', { r: 245, g: 245, b: 242 }),
      paint(palette.id, 'Black', 'Studio', { r: 22, g: 22, b: 24 }),
      paint(palette.id, 'Yellow', 'Studio', { r: 242, g: 201, b: 56 }),
      paint(palette.id, 'Crimson Red', 'Studio', { r: 176, g: 32, b: 48 }),
      paint(palette.id, 'Royal Blue', 'Studio', { r: 42, g: 82, b: 190 }),
      paint(palette.id, 'Brown', 'Studio', { r: 110, g: 68, b: 42 }),
      paint(palette.id, 'Green', 'Studio', { r: 46, g: 140, b: 78 }),
      paint(palette.id, 'Orange', 'Studio', { r: 230, g: 120, b: 40 }),
    ],
  }
}

/** Bold flat process-style set for pop-art / screen-print looks. */
function buildPopArt(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Pop Art Kit',
    'pop_art',
    'Pop Art',
    'Water / acrylic medium',
    'Keep mixes simple — pop art favors flat, high-chroma blocks over subtle blends.',
    'Starter pop-art palette (CMYK + accent brights).',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'Process White', 'Pop Art', { r: 255, g: 255, b: 255 }, 'matte'),
      paint(palette.id, 'Process Black', 'Pop Art', { r: 18, g: 18, b: 20 }, 'matte'),
      paint(palette.id, 'Process Cyan', 'Pop Art', { r: 0, g: 174, b: 239 }, 'matte'),
      paint(palette.id, 'Process Magenta', 'Pop Art', { r: 236, g: 0, b: 140 }, 'matte'),
      paint(palette.id, 'Process Yellow', 'Pop Art', { r: 255, g: 237, b: 0 }, 'matte'),
      paint(palette.id, 'Warhol Red', 'Pop Art', { r: 230, g: 25, b: 55 }, 'matte'),
      paint(palette.id, 'Electric Blue', 'Pop Art', { r: 40, g: 80, b: 220 }, 'matte'),
      paint(palette.id, 'Acid Green', 'Pop Art', { r: 80, g: 220, b: 60 }, 'matte'),
      paint(palette.id, 'Hot Pink', 'Pop Art', { r: 255, g: 64, b: 160 }, 'matte'),
      paint(palette.id, 'Orange Blast', 'Pop Art', { r: 255, g: 120, b: 0 }, 'matte'),
      paint(palette.id, 'Purple Punch', 'Pop Art', { r: 120, g: 40, b: 180 }, 'matte'),
      paint(palette.id, 'Comic Halftone Grey', 'Pop Art', { r: 150, g: 150, b: 155 }, 'matte'),
    ],
  }
}

function buildLacquer(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Lacquer Kit',
    'lacquer',
    'Lacquer',
    'Lacquer thinner',
    'Mix only lacquer-compatible colors. Work in a ventilated space.',
    'Starter lacquer kit.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', 'Lacquer', { r: 248, g: 248, b: 246 }, 'gloss'),
      paint(palette.id, 'Black', 'Lacquer', { r: 16, g: 16, b: 18 }, 'gloss'),
      paint(palette.id, 'Red', 'Lacquer', { r: 190, g: 30, b: 40 }, 'gloss'),
      paint(palette.id, 'Yellow', 'Lacquer', { r: 240, g: 200, b: 40 }, 'gloss'),
      paint(palette.id, 'Blue', 'Lacquer', { r: 30, g: 70, b: 170 }, 'gloss'),
      paint(palette.id, 'Clear Tint Amber', 'Lacquer', { r: 200, g: 140, b: 60 }, 'gloss', 'transparent'),
    ],
  }
}

function buildOil(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Oil Paint Kit',
    'oil',
    'Oil',
    'Linseed / odorless mineral spirits',
    'Mix only oil paints together. Allow proper drying time.',
    'Starter oil paint kit.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'Titanium White', 'Oil', { r: 248, g: 246, b: 240 }, 'satin'),
      paint(palette.id, 'Ivory Black', 'Oil', { r: 28, g: 28, b: 30 }, 'satin'),
      paint(palette.id, 'Cadmium Yellow', 'Oil', { r: 245, g: 200, b: 40 }, 'satin'),
      paint(palette.id, 'Cadmium Red', 'Oil', { r: 200, g: 45, b: 40 }, 'satin'),
      paint(palette.id, 'Ultramarine', 'Oil', { r: 50, g: 70, b: 170 }, 'satin'),
      paint(palette.id, 'Burnt Sienna', 'Oil', { r: 140, g: 70, b: 40 }, 'satin'),
      paint(palette.id, 'Yellow Ochre', 'Oil', { r: 200, g: 155, b: 60 }, 'satin'),
    ],
  }
}

function buildWatercolor(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Watercolor Kit',
    'watercolor',
    'Watercolor',
    'Water',
    'Transparent layering — mix on palette or paper. Watercolors only.',
    'Starter watercolor kit.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'Chinese White', 'Watercolor', { r: 250, g: 250, b: 248 }, 'matte', 'transparent'),
      paint(palette.id, 'Ivory Black', 'Watercolor', { r: 30, g: 30, b: 32 }, 'matte', 'transparent'),
      paint(palette.id, 'Lemon Yellow', 'Watercolor', { r: 250, g: 230, b: 60 }, 'matte', 'transparent'),
      paint(palette.id, 'Alizarin Crimson', 'Watercolor', { r: 170, g: 30, b: 55 }, 'matte', 'transparent'),
      paint(palette.id, 'Ultramarine', 'Watercolor', { r: 45, g: 70, b: 175 }, 'matte', 'transparent'),
      paint(palette.id, 'Phthalo Green', 'Watercolor', { r: 10, g: 130, b: 100 }, 'matte', 'transparent'),
      paint(palette.id, 'Burnt Umber', 'Watercolor', { r: 100, g: 60, b: 35 }, 'matte', 'transparent'),
    ],
  }
}

function buildModelColor(now: number): KitBuild {
  const palette = makePalette(
    now,
    'Model Color Kit',
    'model_color',
    'Hobby',
    'Acrylic thinner',
    'Thin for brush or airbrush. Stay within model acrylics.',
    'Starter model color kit.',
  )
  return {
    palette,
    paints: [
      paint(palette.id, 'White', 'Hobby', { r: 240, g: 240, b: 235 }),
      paint(palette.id, 'Black', 'Hobby', { r: 28, g: 28, b: 30 }),
      paint(palette.id, 'Bone', 'Hobby', { r: 220, g: 205, b: 170 }),
      paint(palette.id, 'Mech Grey', 'Hobby', { r: 95, g: 105, b: 112 }),
      paint(palette.id, 'Hazard Yellow', 'Hobby', { r: 235, g: 195, b: 40 }),
      paint(palette.id, 'Blood Red', 'Hobby', { r: 150, g: 28, b: 38 }),
      paint(palette.id, 'Ultramarine', 'Hobby', { r: 48, g: 70, b: 170 }),
    ],
  }
}

const KIT_BUILDERS: Record<
  Exclude<PaintType, 'custom'>,
  (now: number) => KitBuild
> = {
  automotive_2k: buildAutomotive2k,
  automotive_basecoat: buildAutomotiveBasecoat,
  glc_automotive_pigments: buildGlcAutomotive,
  glc_inks: buildGlcInks,
  acrylic_airbrush: buildAcrylicAirbrush,
  acrylic_brush: buildAcrylicBrush,
  pop_art: buildPopArt,
  lacquer: buildLacquer,
  oil: buildOil,
  watercolor: buildWatercolor,
  model_color: buildModelColor,
}

/** Ensure every starter kit type has a palette (for new + existing DBs). */
export async function ensureAllKitPalettes(db: PaintMatchDB) {
  const existing = await db.palettes.toArray()
  const present = new Set(existing.map((p) => p.paintType))
  const missing = STARTER_KIT_TYPES.filter((t) => !present.has(t))
  if (missing.length === 0) return

  const now = Date.now()
  await db.transaction('rw', db.palettes, db.paints, async () => {
    for (let i = 0; i < missing.length; i++) {
      const type = missing[i]!
      const builder = KIT_BUILDERS[type as Exclude<PaintType, 'custom'>]
      const { palette, paints } = builder(now + i)
      await db.palettes.add(palette)
      await db.paints.bulkAdd(paints)
    }
  })
}

/** @deprecated use ensureAllKitPalettes */
export async function ensureGlcPalettes(db: PaintMatchDB) {
  await ensureAllKitPalettes(db)
}

export async function seedDatabase(db: PaintMatchDB) {
  const now = Date.now()
  const kits = STARTER_KIT_TYPES.map((type, i) =>
    KIT_BUILDERS[type as Exclude<PaintType, 'custom'>](now + i),
  )

  await db.transaction('rw', db.palettes, db.paints, db.settings, async () => {
    await db.palettes.bulkAdd(kits.map((k) => k.palette))
    await db.paints.bulkAdd(kits.flatMap((k) => k.paints))
    const preferred =
      kits.find((k) => k.palette.paintType === 'pop_art')?.palette.id ??
      kits[0]?.palette.id ??
      null
    await db.settings.put({
      id: 'settings',
      activePaletteId: preferred,
      maxPaints: 4,
      averagingKernel: 5,
      mixingMode: 'acrylic_subtractive',
      prioritizeOpaque: true,
      prioritizeTransparent: false,
      totalVolumeMl: 30,
      totalDrops: 20,
      dropMl: 0.05,
      densityGPerMl: 1.1,
    })
  })
}

export function listStarterKitLabels(): string[] {
  return STARTER_KIT_TYPES.map((t) => PAINT_TYPE_LABELS[t])
}
