import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImagePlus } from 'lucide-react'
import { paintFormSchema, type PaintFormValues } from '@/lib/schemas'
import { hsvToRgb, hexToRgb, rgbToHex, rgbToHsv } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { ImageSampler } from '@/components/color/ImageSampler'
import type { AveragingKernel, Paint } from '@/types'

const defaults: PaintFormValues = {
  name: '',
  brand: '',
  finish: 'matte',
  baseType: 'opaque',
  hex: '#808080',
  notes: '',
}

export function PaintEditor({
  initial,
  onSubmit,
  onCancel,
  kernel = 5,
}: {
  initial?: Partial<Paint>
  onSubmit: (values: PaintFormValues) => void
  onCancel: () => void
  kernel?: AveragingKernel
}) {
  const form = useForm<PaintFormValues>({
    resolver: zodResolver(paintFormSchema) as never,
    defaultValues: {
      ...defaults,
      name: initial?.name ?? '',
      brand: initial?.brand ?? '',
      finish: initial?.finish ?? 'matte',
      baseType: initial?.baseType ?? 'opaque',
      hex: initial?.hex ?? '#808080',
      notes: initial?.notes ?? '',
    },
  })

  const hex = form.watch('hex')
  const rgb = useMemo(() => {
    try {
      return hexToRgb(hex.startsWith('#') ? hex : `#${hex}`)
    } catch {
      return { r: 128, g: 128, b: 128 }
    }
  }, [hex])
  const hsv = rgbToHsv(rgb)
  const [mode, setMode] = useState<'hex' | 'rgb' | 'hsv' | 'picker' | 'camera' | 'photo'>(
    'hex',
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!hex.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(hex)) {
      form.setValue('hex', `#${hex.toUpperCase()}`)
    }
  }, [hex, form])

  const setFromRgb = (r: number, g: number, b: number) => {
    form.setValue('hex', rgbToHex({ r, g, b }), { shouldValidate: true })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          ...values,
          hex: values.hex.startsWith('#')
            ? values.hex.toUpperCase()
            : `#${values.hex.toUpperCase()}`,
        }),
      )}
    >
      <div className="flex items-center gap-3">
        <ColorSwatch hex={rgbToHex(rgb)} size="lg" />
        <div className="flex-1 space-y-2">
          <Label>Name</Label>
          <Input placeholder="Crimson Red" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="text-xs text-[var(--color-danger)]">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Brand</Label>
          <Input placeholder="Optional" {...form.register('brand')} />
        </div>
        <div className="space-y-2">
          <Label>Finish</Label>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
            {...form.register('finish')}
          >
            <option value="matte">Matte</option>
            <option value="satin">Satin</option>
            <option value="gloss">Gloss</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Base type</Label>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
            {...form.register('baseType')}
          >
            <option value="opaque">Opaque</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Color method</Label>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="hex">HEX</option>
            <option value="rgb">RGB sliders</option>
            <option value="hsv">HSV picker</option>
            <option value="picker">Color picker</option>
            <option value="camera">Camera (preferred)</option>
            <option value="photo">Photo blobs</option>
          </select>
        </div>
      </div>

      {mode === 'hex' ? (
        <div className="space-y-2">
          <Label>HEX</Label>
          <Input {...form.register('hex')} />
        </div>
      ) : null}

      {mode === 'rgb' ? (
        <div className="space-y-3">
          {(['r', 'g', 'b'] as const).map((ch) => (
            <div key={ch} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="uppercase text-[var(--color-muted)]">{ch}</span>
                <span>{rgb[ch]}</span>
              </div>
              <Slider
                min={0}
                max={255}
                step={1}
                value={[rgb[ch]]}
                onValueChange={([v]) =>
                  setFromRgb(
                    ch === 'r' ? (v ?? 0) : rgb.r,
                    ch === 'g' ? (v ?? 0) : rgb.g,
                    ch === 'b' ? (v ?? 0) : rgb.b,
                  )
                }
              />
            </div>
          ))}
        </div>
      ) : null}

      {mode === 'hsv' ? (
        <div className="space-y-3">
          {(
            [
              ['h', 360],
              ['s', 100],
              ['v', 100],
            ] as const
          ).map(([ch, max]) => (
            <div key={ch} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="uppercase text-[var(--color-muted)]">{ch}</span>
                <span>{hsv[ch]}</span>
              </div>
              <Slider
                min={0}
                max={max}
                step={1}
                value={[hsv[ch]]}
                onValueChange={([v]) => {
                  const next = { ...hsv, [ch]: v ?? 0 }
                  const converted = hsvToRgb(next)
                  setFromRgb(converted.r, converted.g, converted.b)
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {mode === 'picker' ? (
        <div className="space-y-2">
          <Label>System color picker</Label>
          <input
            type="color"
            value={rgbToHex(rgb)}
            onChange={(e) => form.setValue('hex', e.target.value.toUpperCase())}
            className="h-14 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent"
          />
        </div>
      ) : null}

      {mode === 'camera' || mode === 'photo' ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                capture={mode === 'camera' ? 'environment' : undefined}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const url = URL.createObjectURL(file)
                  setPhotoUrl(url)
                }}
              />
              <Button type="button" variant="secondary" className="w-full" asChild>
                <span>
                  {mode === 'camera' ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {mode === 'camera' ? 'Open camera' : 'Upload paint blobs'}
                </span>
              </Button>
            </label>
          </div>
          {photoUrl ? (
            <ImageSampler
              imageUrl={photoUrl}
              kernel={kernel}
              onSample={(sampled) => setFromRgb(sampled.r, sampled.g, sampled.b)}
            />
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              Point at a bottle, cap, dried swatch, or spray card — tap to average the color.
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea placeholder="Optional notes" {...form.register('notes')} />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save paint
        </Button>
      </div>
    </form>
  )
}
