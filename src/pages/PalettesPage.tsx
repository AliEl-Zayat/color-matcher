import { useMemo, useState } from 'react'
import {
  Archive,
  Copy,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useCreatePaint,
  useCreatePalette,
  useDeletePaint,
  useDeletePalette,
  useDuplicatePaint,
  useDuplicatePalette,
  usePalettes,
  usePaints,
  useSettings,
  useUpdatePaint,
  useUpdatePalette,
  useUpdateSettings,
} from '@/hooks/useAppData'
import { db } from '@/db'
import { downloadJson } from '@/lib/utils'
import { PAINT_TYPE_LABELS, type Paint, type Palette, type PaintType } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { PaintEditor } from '@/components/paint/PaintEditor'
import { Badge } from '@/components/ui/badge'
import type { PaintFormValues, PaletteFormValues } from '@/lib/schemas'
import { hexToRgb, rgbToLab } from '@/lib/color'

export function PalettesPage() {
  const { data: palettes = [] } = usePalettes(true)
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const createPalette = useCreatePalette()
  const updatePalette = useUpdatePalette()
  const deletePalette = useDeletePalette()
  const duplicatePalette = useDuplicatePalette()

  const activeId = settings?.activePaletteId
  const { data: paints = [] } = usePaints(activeId)
  const createPaint = useCreatePaint()
  const updatePaint = useUpdatePaint()
  const deletePaint = useDeletePaint()
  const duplicatePaint = useDuplicatePaint()

  const [paletteDialog, setPaletteDialog] = useState(false)
  const [editingPalette, setEditingPalette] = useState<Palette | null>(null)
  const [paintDialog, setPaintDialog] = useState(false)
  const [editingPaint, setEditingPaint] = useState<Paint | null>(null)
  const [paletteForm, setPaletteForm] = useState<PaletteFormValues>({
    name: '',
    paintType: 'acrylic_brush',
    brand: '',
    defaultThinner: '',
    mixingNotes: '',
    notes: '',
  })

  const active = useMemo(
    () => palettes.find((p) => p.id === activeId) ?? null,
    [activeId, palettes],
  )

  const openCreatePalette = () => {
    setEditingPalette(null)
    setPaletteForm({
      name: '',
      paintType: 'acrylic_brush',
      brand: '',
      defaultThinner: '',
      mixingNotes: '',
      notes: '',
    })
    setPaletteDialog(true)
  }

  const openEditPalette = (p: Palette) => {
    setEditingPalette(p)
    setPaletteForm({
      name: p.name,
      paintType: p.paintType,
      brand: p.brand ?? '',
      defaultThinner: p.defaultThinner ?? '',
      mixingNotes: p.mixingNotes ?? '',
      notes: p.notes ?? '',
    })
    setPaletteDialog(true)
  }

  const savePalette = async () => {
    if (editingPalette) {
      await updatePalette.mutateAsync({
        ...editingPalette,
        ...paletteForm,
      })
    } else {
      const created = await createPalette.mutateAsync(paletteForm)
      await updateSettings.mutateAsync({ activePaletteId: created.id })
    }
    setPaletteDialog(false)
  }

  const exportPalette = async (palette: Palette) => {
    const list = await db.paints.where('paletteId').equals(palette.id).toArray()
    downloadJson({ palette, paints: list }, `${palette.name.replace(/\s+/g, '-').toLowerCase()}.json`)
  }

  const importPaletteJson = async (file: File) => {
    const text = await file.text()
    const data = JSON.parse(text) as {
      palette?: Partial<Palette>
      paints?: Array<Partial<Paint>>
      name?: string
      paintType?: PaintType
      brand?: string
      defaultThinner?: string
      mixingNotes?: string
      notes?: string
    }
    const base: Partial<Palette> = data.palette ?? {
      name: data.name,
      paintType: data.paintType,
      brand: data.brand,
      defaultThinner: data.defaultThinner,
      mixingNotes: data.mixingNotes,
      notes: data.notes,
    }
    const created = await createPalette.mutateAsync({
      name: String(base.name ?? 'Imported Palette'),
      paintType: base.paintType ?? 'custom',
      brand: base.brand,
      defaultThinner: base.defaultThinner,
      mixingNotes: base.mixingNotes,
      notes: base.notes,
    })
    const incoming = data.paints ?? []
    for (const p of incoming) {
      if (!p.name || (!p.hex && !p.rgb)) continue
      const hex = p.hex ?? '#808080'
      await createPaint.mutateAsync({
        paletteId: created.id,
        name: p.name,
        brand: p.brand ?? '',
        finish: p.finish ?? 'matte',
        baseType: p.baseType ?? 'opaque',
        hex,
        notes: p.notes,
      })
    }
    await updateSettings.mutateAsync({ activePaletteId: created.id })
  }

  const savePaint = async (values: PaintFormValues) => {
    if (!activeId) return
    if (editingPaint) {
      const rgb = hexToRgb(values.hex)
      await updatePaint.mutateAsync({
        ...editingPaint,
        name: values.name,
        brand: values.brand,
        finish: values.finish,
        baseType: values.baseType,
        hex: values.hex,
        rgb,
        lab: rgbToLab(rgb),
        notes: values.notes,
      })
    } else {
      await createPaint.mutateAsync({
        paletteId: activeId,
        ...values,
      })
    }
    setPaintDialog(false)
    setEditingPaint(null)
  }

  return (
    <div className="space-y-4 pb-4">
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Paint palettes</CardTitle>
            <CardDescription>
              Each palette is one compatible paint system. Never mix across palettes.
            </CardDescription>
          </div>
          <Button size="icon" onClick={openCreatePalette} aria-label="Create palette">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <label>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importPaletteJson(file)
              }}
            />
            <Button asChild variant="secondary">
              <span>
                <Upload className="h-4 w-4" /> Import JSON
              </span>
            </Button>
          </label>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {palettes.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => updateSettings.mutate({ activePaletteId: p.id })}
            className={`rounded-[var(--radius-xl)] border p-4 text-left transition ${
              p.id === activeId
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
                : 'border-white/10 bg-white/4 hover:bg-white/8'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {PAINT_TYPE_LABELS[p.paintType]}
                  {p.brand ? ` · ${p.brand}` : ''}
                </p>
              </div>
              {p.archived ? <Badge>Archived</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  openEditPalette(p)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  void duplicatePalette.mutateAsync(p.id)
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  void updatePalette.mutateAsync({ ...p, archived: !p.archived })
                }}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  void exportPalette(p)
                }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete palette “${p.name}” and its paints?`)) {
                    void deletePalette.mutateAsync(p.id)
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{active.name} paints</CardTitle>
              <CardDescription>
                {paints.length} colors · {PAINT_TYPE_LABELS[active.paintType]}
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingPaint(null)
                setPaintDialog(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add paint
            </Button>
          </div>

          <div className="space-y-2">
            {paints.map((paint) => (
              <div
                key={paint.id}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5"
              >
                <ColorSwatch hex={paint.hex} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{paint.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {paint.hex} · {paint.finish} · {paint.baseType}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingPaint(paint)
                    setPaintDialog(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void duplicatePaint.mutateAsync(paint)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete ${paint.name}?`)) {
                      void deletePaint.mutateAsync(paint)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {paints.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No paints yet. Add colors via camera, photo, HEX, RGB, or HSV.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Dialog open={paletteDialog} onOpenChange={setPaletteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPalette ? 'Edit palette' : 'Create palette'}
            </DialogTitle>
            <DialogDescription>
              Keep only mix-compatible paints in the same palette.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={paletteForm.name}
                onChange={(e) =>
                  setPaletteForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Paint type</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                value={paletteForm.paintType}
                onChange={(e) =>
                  setPaletteForm((f) => ({
                    ...f,
                    paintType: e.target.value as PaintType,
                  }))
                }
              >
                {Object.entries(PAINT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={paletteForm.brand}
                onChange={(e) =>
                  setPaletteForm((f) => ({ ...f, brand: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default thinner</Label>
              <Input
                value={paletteForm.defaultThinner}
                onChange={(e) =>
                  setPaletteForm((f) => ({
                    ...f,
                    defaultThinner: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Mixing notes</Label>
              <Textarea
                value={paletteForm.mixingNotes}
                onChange={(e) =>
                  setPaletteForm((f) => ({
                    ...f,
                    mixingNotes: e.target.value,
                  }))
                }
              />
            </div>
            <Button className="w-full" onClick={() => void savePalette()}>
              Save palette
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paintDialog} onOpenChange={setPaintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPaint ? 'Edit paint' : 'Add paint'}</DialogTitle>
            <DialogDescription>
              Camera sampling is recommended for real bottles and swatches.
            </DialogDescription>
          </DialogHeader>
          <PaintEditor
            initial={editingPaint ?? undefined}
            kernel={settings?.averagingKernel ?? 5}
            onCancel={() => setPaintDialog(false)}
            onSubmit={(values) => void savePaint(values)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
