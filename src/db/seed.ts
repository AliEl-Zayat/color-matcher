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
    createdAt: now,
    updatedAt: now,
  }
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
    await db.palettes.bulkAdd([acrylic, basecoat, model])
    await db.paints.bulkAdd([...acrylicPaints, ...basePaints, ...modelPaints])
    await db.settings.put({
      id: 'settings',
      activePaletteId: acrylic.id,
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
