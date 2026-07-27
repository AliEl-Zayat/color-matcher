import Dexie, { type Table } from 'dexie'
import type { AppSettings, MixRecipe, Paint, Palette, Project } from '@/types'
import { ensureAllKitPalettes, seedDatabase } from '@/db/seed'

export class PaintMatchDB extends Dexie {
  palettes!: Table<Palette, string>
  paints!: Table<Paint, string>
  recipes!: Table<MixRecipe, string>
  projects!: Table<Project, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('paint-match-ai')
    this.version(1).stores({
      palettes: 'id, name, paintType, archived, updatedAt',
      paints: 'id, paletteId, name, brand, updatedAt',
      recipes: 'id, paletteId, projectId, favorite, createdAt',
      projects: 'id, paletteId, name, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new PaintMatchDB()

let ready: Promise<void> | null = null

export async function ensureDbReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const count = await db.palettes.count()
      if (count === 0) {
        await seedDatabase(db)
      } else {
        await ensureAllKitPalettes(db)
      }
      const settings = await db.settings.get('settings')
      if (!settings) {
        const first = await db.palettes.orderBy('createdAt').first()
        await db.settings.put({
          id: 'settings',
          activePaletteId: first?.id ?? null,
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
      }
    })()
  }
  return ready
}
