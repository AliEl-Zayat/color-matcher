import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  usePalettes,
  usePaints,
  useSaveRecipe,
  useSettings,
  useUpdateSettings,
} from '@/hooks/useAppData'
import {
  createSwatchFromRgb,
  extractPaletteFromImageUrl,
  type ExtractedSwatch,
} from '@/lib/extractPalette'
import { describeColor, rgbToHex } from '@/lib/color'
import { findBestMix } from '@/lib/mixer'
import type { MixResult, RGB } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PalettePicker } from '@/components/layout/PalettePicker'
import { ImageSampler } from '@/components/color/ImageSampler'
import { MixResultCard } from '@/components/mix/MixResultCard'
import { ColorSwatch } from '@/components/color/ColorSwatch'

type SwatchWithMix = ExtractedSwatch & {
  mix: MixResult | null
}

export function ExtractPage() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: palettes = [] } = usePalettes()
  const paletteId = settings?.activePaletteId
  const { data: paints = [] } = usePaints(paletteId)
  const saveRecipe = useSaveRecipe()
  const palette = palettes.find((p) => p.id === paletteId)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [colorCount, setColorCount] = useState(6)
  const [extracting, setExtracting] = useState(false)
  const [swatches, setSwatches] = useState<SwatchWithMix[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => swatches.find((s) => s.id === selectedId) ?? null,
    [selectedId, swatches],
  )

  const paintKey = paints.map((p) => p.id).join('|')

  // Keep recipes in sync when the active paint palette changes.
  useEffect(() => {
    if (swatches.length === 0 || !settings || paints.length === 0) return
    setSwatches((prev) =>
      prev.map((s) => ({
        ...s,
        mix: findBestMix(s.rgb, paints, {
          maxPaints: settings.maxPaints,
          lockedPaintIds: [],
          excludedPaintIds: [],
          prioritizeOpaque: settings.prioritizeOpaque,
          prioritizeTransparent: settings.prioritizeTransparent,
          mixingMode: settings.mixingMode,
          totalVolumeMl: settings.totalVolumeMl,
          totalDrops: settings.totalDrops,
          dropMl: settings.dropMl,
          densityGPerMl: settings.densityGPerMl,
        }),
      })),
    )
  }, [paletteId, paintKey])

  const onFile = (file?: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setSwatches([])
    setSelectedId(null)
    setError(null)
    setAddMode(false)
  }

  const computeMix = (rgb: RGB): MixResult | null => {
    if (!settings || !paletteId || paints.length === 0) return null
    return findBestMix(rgb, paints, {
      maxPaints: settings.maxPaints,
      lockedPaintIds: [],
      excludedPaintIds: [],
      prioritizeOpaque: settings.prioritizeOpaque,
      prioritizeTransparent: settings.prioritizeTransparent,
      mixingMode: settings.mixingMode,
      totalVolumeMl: settings.totalVolumeMl,
      totalDrops: settings.totalDrops,
      dropMl: settings.dropMl,
      densityGPerMl: settings.densityGPerMl,
    })
  }

  const runExtract = async () => {
    if (!imageUrl) return
    if (!paletteId) {
      setError('Select a paint palette first — recipes use only that system.')
      return
    }
    setExtracting(true)
    setError(null)
    try {
      const extracted = await extractPaletteFromImageUrl(imageUrl, {
        count: colorCount,
      })
      if (extracted.length === 0) {
        setError('Could not extract colors from this image.')
        setSwatches([])
        return
      }
      const withMix: SwatchWithMix[] = extracted.map((s) => ({
        ...s,
        mix: computeMix(s.rgb),
      }))
      setSwatches(withMix)
      setSelectedId(withMix[0]?.id ?? null)
      setAddMode(false)
    } catch {
      setError('Extraction failed. Try another image.')
    } finally {
      setExtracting(false)
    }
  }

  const removeSwatch = (id: string) => {
    setSwatches((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (selectedId === id) setSelectedId(next[0]?.id ?? null)
      return next
    })
  }

  const addSwatch = (rgb: RGB) => {
    // Avoid near-duplicates
    const hex = rgbToHex(rgb)
    if (swatches.some((s) => s.hex === hex)) {
      setSelectedId(swatches.find((s) => s.hex === hex)!.id)
      setAddMode(false)
      return
    }
    const base = createSwatchFromRgb(rgb)
    const entry: SwatchWithMix = { ...base, mix: computeMix(rgb) }
    setSwatches((prev) => [...prev, entry])
    setSelectedId(entry.id)
    setAddMode(false)
  }

  const recomputeAll = () => {
    setSwatches((prev) =>
      prev.map((s) => ({
        ...s,
        mix: computeMix(s.rgb),
      })),
    )
  }

  const saveAll = async () => {
    if (!palette || !settings) return
    const savable = swatches.filter((s) => s.mix)
    for (const s of savable) {
      const target = describeColor(s.rgb)
      await saveRecipe.mutateAsync({
        paletteId: palette.id,
        paletteName: palette.name,
        target,
        predicted: s.mix!.predicted,
        components: s.mix!.components,
        deltaE: s.mix!.deltaE,
        matchPercent: s.mix!.matchPercent,
        mixingMode: s.mix!.mixingMode,
        maxPaints: settings.maxPaints,
        imageThumb: imageUrl ?? undefined,
        favorite: false,
        totalMl: settings.totalVolumeMl,
        totalDrops: settings.totalDrops,
        notes: `Extracted palette color ${s.hex}`,
      })
    }
    setSavedMsg(`Saved ${savable.length} recipes to History`)
    window.setTimeout(() => setSavedMsg(null), 2400)
  }

  return (
    <motion.div
      className="space-y-4 pb-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="space-y-3">
        <div>
          <CardTitle>Extract palette</CardTitle>
          <CardDescription>
            Pull a full color set from one photo, get a mix recipe for each
            color, then add or remove swatches.
          </CardDescription>
        </div>
        <PalettePicker
          palettes={palettes}
          value={paletteId}
          onChange={(id) => {
            updateSettings.mutate({ activePaletteId: id })
            // Recompute after palette paints load on next interaction
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button asChild variant="secondary" className="w-full">
              <span>
                <Camera className="h-4 w-4" /> Capture
              </span>
            </Button>
          </label>
          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button asChild variant="secondary" className="w-full">
              <span>
                <ImagePlus className="h-4 w-4" /> Upload
              </span>
            </Button>
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Colors to extract</Label>
            <span className="text-sm font-semibold">{colorCount}</span>
          </div>
          <input
            type="range"
            min={3}
            max={10}
            step={1}
            value={colorCount}
            onChange={(e) => setColorCount(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>

        <Button
          className="w-full"
          disabled={!imageUrl || extracting || !paletteId}
          onClick={() => void runExtract()}
        >
          {extracting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {extracting ? 'Extracting…' : 'Extract palette + recipes'}
        </Button>

        {error ? (
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
        ) : null}
      </Card>

      {imageUrl ? (
        <Card className="overflow-hidden p-2">
          <img
            src={imageUrl}
            alt="Reference"
            className="max-h-56 w-full rounded-xl object-cover"
          />
        </Card>
      ) : null}

      {swatches.length > 0 ? (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>Extracted colors</CardTitle>
              <CardDescription>
                Tap a swatch for its recipe. Remove or add picks anytime.
              </CardDescription>
            </div>
            <Badge>{swatches.length} colors</Badge>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {swatches.map((s) => (
              <div
                key={s.id}
                className={`relative rounded-2xl border p-2 transition ${
                  selectedId === s.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'border-white/10 bg-white/4'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedId(s.id)}
                >
                  <ColorSwatch hex={s.hex} size="md" className="mx-auto" />
                  <p className="mt-1 truncate text-center text-[10px] font-semibold">
                    {s.hex}
                  </p>
                  <p className="text-center text-[10px] text-[var(--color-muted)]">
                    {s.mix ? `${s.mix.matchPercent}%` : '—'}
                  </p>
                </button>
                <button
                  type="button"
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#121821] text-[var(--color-danger)]"
                  onClick={() => removeSwatch(s.id)}
                  aria-label={`Remove ${s.hex}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={addMode ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => setAddMode((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              {addMode ? 'Cancel add' : 'Add color from image'}
            </Button>
            <Button type="button" variant="outline" onClick={recomputeAll}>
              Refresh recipes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void saveAll()}
              disabled={!swatches.some((s) => s.mix)}
            >
              <Save className="h-4 w-4" /> Save all
            </Button>
          </div>
        </Card>
      ) : null}

      {addMode && imageUrl ? (
        <ImageSampler
          imageUrl={imageUrl}
          kernel={settings?.averagingKernel ?? 5}
          onSample={(rgb) => addSwatch(rgb)}
        />
      ) : null}

      {selected?.mix ? (
        <MixResultCard
          targetRgb={selected.rgb}
          targetHex={selected.hex}
          result={selected.mix}
          paletteName={palette?.name ?? 'Palette'}
          onSave={() => {
            if (!palette || !settings || !selected.mix) return
            void saveRecipe
              .mutateAsync({
                paletteId: palette.id,
                paletteName: palette.name,
                target: describeColor(selected.rgb),
                predicted: selected.mix.predicted,
                components: selected.mix.components,
                deltaE: selected.mix.deltaE,
                matchPercent: selected.mix.matchPercent,
                mixingMode: selected.mix.mixingMode,
                maxPaints: settings.maxPaints,
                imageThumb: imageUrl ?? undefined,
                favorite: false,
                totalMl: settings.totalVolumeMl,
                totalDrops: settings.totalDrops,
                notes: `Extracted palette color ${selected.hex}`,
              })
              .then(() => {
                setSavedMsg('Recipe saved to History')
                window.setTimeout(() => setSavedMsg(null), 2200)
              })
          }}
        />
      ) : selected ? (
        <Card>
          <CardTitle>No mix available</CardTitle>
          <CardDescription className="mt-1">
            Add paints to the selected palette, then tap Refresh recipes.
          </CardDescription>
        </Card>
      ) : null}

      {savedMsg ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--color-accent)]/30 bg-[#121821] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] shadow-xl"
        >
          {savedMsg}
        </motion.div>
      ) : null}
    </motion.div>
  )
}
