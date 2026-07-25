import { z } from 'zod'

export const rgbSchema = z.object({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
})

export const paintFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  brand: z.string().max(80),
  finish: z.enum(['matte', 'satin', 'gloss']),
  baseType: z.enum(['opaque', 'transparent']),
  hex: z
    .string()
    .regex(/^#?[0-9A-Fa-f]{6}$/, 'Enter a valid HEX color'),
  notes: z.string().max(500).optional(),
})

export type PaintFormValues = z.infer<typeof paintFormSchema>

export const paletteFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  paintType: z.enum([
    'automotive_2k',
    'automotive_basecoat',
    'acrylic_airbrush',
    'acrylic_brush',
    'lacquer',
    'oil',
    'watercolor',
    'model_color',
    'custom',
  ]),
  brand: z.string().max(80).optional(),
  defaultThinner: z.string().max(80).optional(),
  mixingNotes: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
})

export type PaletteFormValues = z.infer<typeof paletteFormSchema>

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  paletteId: z.string().min(1),
  notes: z.string().max(1000).optional(),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>
