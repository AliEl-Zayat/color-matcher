import type { PaintMatchDB } from '@/db'
import { rgbToHex, rgbToLab } from '@/lib/color'
import { uid } from '@/lib/utils'
import type { Paint, Palette, RGB } from '@/types'

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

function buildGlcAutomotivePalette(now: number): { palette: Palette; paints: Paint[] } {
  const palette: Palette = {
    id: uid('palette'),
    name: 'GLC Automotive Pigments',
    paintType: 'glc_automotive_pigments',
    brand: 'GLC',
    defaultThinner: 'GLC binder / system reducer',
    mixingNotes:
      'Mix only GLC automotive pigments together in compatible binder. Prefer weight ratios for production.',
    notes: 'Starter GLC automotive pigment set — replace with your real bottle samples.',
    archived: false,
    createdAt: now,
    updatedAt: now,
  }

  const paints = [
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
  ]

  return { palette, paints }
}

function buildGlcInksPalette(now: number): { palette: Palette; paints: Paint[] } {
  const palette: Palette = {
    id: uid('palette'),
    name: 'GLC Inks',
    paintType: 'glc_inks',
    brand: 'GLC',
    defaultThinner: 'GLC ink reducer',
    mixingNotes:
      'GLC inks are a separate system — do not mix with automotive pigments or other binders.',
    notes: 'Starter GLC ink set — sample your real inks for production matching.',
    archived: false,
    createdAt: now + 1,
    updatedAt: now + 1,
  }

  const paints = [
    paint(palette.id, 'Ink White', 'GLC', { r: 250, g: 250, b: 248 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Black', 'GLC', { r: 12, g: 12, b: 14 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Yellow', 'GLC', { r: 245, g: 205, b: 40 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Magenta', 'GLC', { r: 196, g: 28, b: 96 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Cyan', 'GLC', { r: 0, g: 156, b: 210 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Orange', 'GLC', { r: 238, g: 96, b: 32 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Violet', 'GLC', { r: 108, g: 36, b: 156 }, 'gloss', 'transparent'),
    paint(palette.id, 'Ink Green', 'GLC', { r: 20, g: 150, b: 92 }, 'gloss', 'transparent'),
  ]

  return { palette, paints }
}

/** Adds GLC starter palettes if they are not already present. */
export async function ensureGlcPalettes(db: PaintMatchDB) {
  const existing = await db.palettes.toArray()
  const hasPigments = existing.some((p) => p.paintType === 'glc_automotive_pigments')
  const hasInks = existing.some((p) => p.paintType === 'glc_inks')
  if (hasPigments && hasInks) return

  const now = Date.now()
  await db.transaction('rw', db.palettes, db.paints, async () => {
    if (!hasPigments) {
      const { palette, paints } = buildGlcAutomotivePalette(now)
      await db.palettes.add(palette)
      await db.paints.bulkAdd(paints)
    }
    if (!hasInks) {
      const { palette, paints } = buildGlcInksPalette(now + 2)
      await db.palettes.add(palette)
      await db.paints.bulkAdd(paints)
    }
  })
}

export async function seedDatabase(db: PaintMatchDB) {
  const now = Date.now()

  const acrylic: Palette = {
    id: uid('palette'),
    name: 'Acrylic Brush Paints',
    paintType: 'acrylic_brush',
    brand: 'Studio',
    defaultThinner: 'Water',
    mixingNotes: 'Mix thoroughly on a wet palette.',
    notes: 'Starter acrylic set for brush work.',
    archived: false,
    createdAt: now,
    updatedAt: now,
  }

  const basecoat: Palette = {
    id: uid('palette'),
    name: 'Automotive Basecoat',
    paintType: 'automotive_basecoat',
    brand: 'Shop',
    defaultThinner: 'Basecoat thinner',
    mixingNotes: 'Shake well. Mix by weight when possible.',
    notes: 'Compatible basecoat system only.',
    archived: false,
    createdAt: now + 1,
    updatedAt: now + 1,
  }

  const model: Palette = {
    id: uid('palette'),
    name: 'Model Color',
    paintType: 'model_color',
    brand: 'Hobby',
    defaultThinner: 'Acrylic thinner',
    mixingNotes: 'Thin for airbrush ~2:1 paint:thinner.',
    archived: false,
    createdAt: now + 2,
    updatedAt: now + 2,
  }

  const glcPigments = buildGlcAutomotivePalette(now + 3)
  const glcInks = buildGlcInksPalette(now + 4)

  const acrylicPaints = [
    paint(acrylic.id, 'White', 'Studio', { r: 245, g: 245, b: 242 }),
    paint(acrylic.id, 'Black', 'Studio', { r: 22, g: 22, b: 24 }),
    paint(acrylic.id, 'Yellow', 'Studio', { r: 242, g: 201, b: 56 }),
    paint(acrylic.id, 'Crimson Red', 'Studio', { r: 176, g: 32, b: 48 }),
    paint(acrylic.id, 'Royal Blue', 'Studio', { r: 42, g: 82, b: 190 }),
    paint(acrylic.id, 'Brown', 'Studio', { r: 110, g: 68, b: 42 }),
    paint(acrylic.id, 'Green', 'Studio', { r: 46, g: 140, b: 78 }),
    paint(acrylic.id, 'Orange', 'Studio', { r: 230, g: 120, b: 40 }),
  ]

  const basePaints = [
    paint(basecoat.id, 'White', 'Shop', { r: 250, g: 250, b: 248 }, 'gloss'),
    paint(basecoat.id, 'Black', 'Shop', { r: 18, g: 18, b: 20 }, 'gloss'),
    paint(basecoat.id, 'Warm Brown', 'Shop', { r: 120, g: 78, b: 48 }, 'satin'),
    paint(basecoat.id, 'Yellow Oxide', 'Shop', { r: 210, g: 160, b: 50 }, 'satin'),
    paint(basecoat.id, 'Scarlet', 'Shop', { r: 190, g: 40, b: 45 }, 'satin'),
    paint(basecoat.id, 'Silver', 'Shop', { r: 180, g: 185, b: 190 }, 'gloss', 'transparent'),
  ]

  const modelPaints = [
    paint(model.id, 'White', 'Hobby', { r: 240, g: 240, b: 235 }),
    paint(model.id, 'Black', 'Hobby', { r: 28, g: 28, b: 30 }),
    paint(model.id, 'Bone', 'Hobby', { r: 220, g: 205, b: 170 }),
    paint(model.id, 'Mech Grey', 'Hobby', { r: 95, g: 105, b: 112 }),
    paint(model.id, 'Hazard Yellow', 'Hobby', { r: 235, g: 195, b: 40 }),
    paint(model.id, 'Blood Red', 'Hobby', { r: 150, g: 28, b: 38 }),
    paint(model.id, 'Ultramarine', 'Hobby', { r: 48, g: 70, b: 170 }),
  ]

  await db.transaction('rw', db.palettes, db.paints, db.settings, async () => {
    await db.palettes.bulkAdd([
      acrylic,
      basecoat,
      model,
      glcPigments.palette,
      glcInks.palette,
    ])
    await db.paints.bulkAdd([
      ...acrylicPaints,
      ...basePaints,
      ...modelPaints,
      ...glcPigments.paints,
      ...glcInks.paints,
    ])
    await db.settings.put({
      id: 'settings',
      activePaletteId: glcPigments.palette.id,
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
