import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, ensureDbReady } from '@/db'
import { hexToRgb, rgbToHex, rgbToLab } from '@/lib/color'
import { uid } from '@/lib/utils'
import type {
  AppSettings,
  MixRecipe,
  Paint,
  PaintFinish,
  PaintBaseType,
  Palette,
  Project,
} from '@/types'

async function ready() {
  await ensureDbReady()
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      await ready()
      const s = await db.settings.get('settings')
      if (!s) throw new Error('Settings missing')
      return s
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      await ready()
      const current = await db.settings.get('settings')
      if (!current) throw new Error('Settings missing')
      const next = { ...current, ...patch, id: 'settings' as const }
      await db.settings.put(next)
      return next
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function usePalettes(includeArchived = false) {
  return useQuery({
    queryKey: ['palettes', includeArchived],
    queryFn: async () => {
      await ready()
      const all = await db.palettes.orderBy('updatedAt').reverse().toArray()
      return includeArchived ? all : all.filter((p) => !p.archived)
    },
  })
}

export function usePalette(id?: string | null) {
  return useQuery({
    queryKey: ['palette', id],
    enabled: Boolean(id),
    queryFn: async () => {
      await ready()
      return (await db.palettes.get(id!)) ?? null
    },
  })
}

export function usePaints(paletteId?: string | null) {
  return useQuery({
    queryKey: ['paints', paletteId],
    enabled: Boolean(paletteId),
    queryFn: async () => {
      await ready()
      return db.paints.where('paletteId').equals(paletteId!).sortBy('name')
    },
  })
}

export function useCreatePalette() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: Omit<Palette, 'id' | 'createdAt' | 'updatedAt' | 'archived'> & {
        archived?: boolean
      },
    ) => {
      await ready()
      const now = Date.now()
      const palette: Palette = {
        ...input,
        id: uid('palette'),
        archived: input.archived ?? false,
        createdAt: now,
        updatedAt: now,
      }
      await db.palettes.add(palette)
      return palette
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['palettes'] }),
  })
}

export function useUpdatePalette() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (palette: Palette) => {
      await ready()
      const next = { ...palette, updatedAt: Date.now() }
      await db.palettes.put(next)
      return next
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['palettes'] })
      qc.invalidateQueries({ queryKey: ['palette', p.id] })
    },
  })
}

export function useDeletePalette() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (paletteId: string) => {
      await ready()
      await db.transaction(
        'rw',
        db.palettes,
        db.paints,
        db.recipes,
        db.projects,
        db.settings,
        async () => {
          await db.paints.where('paletteId').equals(paletteId).delete()
          await db.recipes.where('paletteId').equals(paletteId).delete()
          const projects = await db.projects
            .where('paletteId')
            .equals(paletteId)
            .toArray()
          for (const project of projects) {
            await db.projects.delete(project.id)
          }
          await db.palettes.delete(paletteId)
          const settings = await db.settings.get('settings')
          if (settings?.activePaletteId === paletteId) {
            const next = await db.palettes.filter((p) => !p.archived).first()
            await db.settings.put({
              ...settings,
              activePaletteId: next?.id ?? null,
            })
          }
        },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['palettes'] })
      qc.invalidateQueries({ queryKey: ['paints'] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useDuplicatePalette() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (paletteId: string) => {
      await ready()
      const source = await db.palettes.get(paletteId)
      if (!source) throw new Error('Palette not found')
      const paints = await db.paints.where('paletteId').equals(paletteId).toArray()
      const now = Date.now()
      const newPalette: Palette = {
        ...source,
        id: uid('palette'),
        name: `${source.name} Copy`,
        archived: false,
        createdAt: now,
        updatedAt: now,
      }
      const newPaints = paints.map((p) => ({
        ...p,
        id: uid('paint'),
        paletteId: newPalette.id,
        createdAt: now,
        updatedAt: now,
      }))
      await db.transaction('rw', db.palettes, db.paints, async () => {
        await db.palettes.add(newPalette)
        await db.paints.bulkAdd(newPaints)
      })
      return newPalette
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['palettes'] })
      qc.invalidateQueries({ queryKey: ['paints'] })
    },
  })
}

export interface PaintInput {
  paletteId: string
  name: string
  brand: string
  finish: PaintFinish
  baseType: PaintBaseType
  hex: string
  notes?: string
}

export function useCreatePaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaintInput) => {
      await ready()
      const rgb = hexToRgb(input.hex.startsWith('#') ? input.hex : `#${input.hex}`)
      const now = Date.now()
      const paint: Paint = {
        id: uid('paint'),
        paletteId: input.paletteId,
        name: input.name,
        brand: input.brand,
        finish: input.finish,
        baseType: input.baseType,
        rgb,
        hex: rgbToHex(rgb),
        lab: rgbToLab(rgb),
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      }
      await db.paints.add(paint)
      await db.palettes.update(input.paletteId, { updatedAt: now })
      return paint
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['paints', p.paletteId] })
      qc.invalidateQueries({ queryKey: ['palettes'] })
    },
  })
}

export function useUpdatePaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (paint: Paint) => {
      await ready()
      const next: Paint = {
        ...paint,
        hex: rgbToHex(paint.rgb),
        lab: rgbToLab(paint.rgb),
        updatedAt: Date.now(),
      }
      await db.paints.put(next)
      await db.palettes.update(paint.paletteId, { updatedAt: Date.now() })
      return next
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['paints', p.paletteId] })
      qc.invalidateQueries({ queryKey: ['palettes'] })
    },
  })
}

export function useDeletePaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (paint: Paint) => {
      await ready()
      await db.paints.delete(paint.id)
      await db.palettes.update(paint.paletteId, { updatedAt: Date.now() })
      return paint
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['paints', p.paletteId] })
      qc.invalidateQueries({ queryKey: ['palettes'] })
    },
  })
}

export function useDuplicatePaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (paint: Paint) => {
      await ready()
      const now = Date.now()
      const copy: Paint = {
        ...paint,
        id: uid('paint'),
        name: `${paint.name} Copy`,
        createdAt: now,
        updatedAt: now,
      }
      await db.paints.add(copy)
      return copy
    },
    onSuccess: (p) => qc.invalidateQueries({ queryKey: ['paints', p.paletteId] }),
  })
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      await ready()
      return db.recipes.orderBy('createdAt').reverse().toArray()
    },
  })
}

export function useSaveRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipe: Omit<MixRecipe, 'id' | 'createdAt'> & { id?: string }) => {
      await ready()
      const full: MixRecipe = {
        ...recipe,
        id: recipe.id ?? uid('recipe'),
        createdAt: Date.now(),
      }
      await db.recipes.put(full)
      if (full.projectId) {
        const project = await db.projects.get(full.projectId)
        if (project && !project.recipeIds.includes(full.id)) {
          await db.projects.put({
            ...project,
            recipeIds: [full.id, ...project.recipeIds],
            updatedAt: Date.now(),
          })
        }
      }
      return full
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipe: MixRecipe) => {
      await ready()
      await db.recipes.put(recipe)
      return recipe
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await ready()
      await db.recipes.delete(id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      await ready()
      return db.projects.orderBy('updatedAt').reverse().toArray()
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: Pick<Project, 'name' | 'paletteId' | 'notes'>,
    ) => {
      await ready()
      const now = Date.now()
      const project: Project = {
        id: uid('project'),
        name: input.name,
        paletteId: input.paletteId,
        notes: input.notes,
        referenceImages: [],
        recipeIds: [],
        favoriteRecipeIds: [],
        createdAt: now,
        updatedAt: now,
      }
      await db.projects.add(project)
      return project
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (project: Project) => {
      await ready()
      const next = { ...project, updatedAt: Date.now() }
      await db.projects.put(next)
      return next
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await ready()
      await db.projects.delete(id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
