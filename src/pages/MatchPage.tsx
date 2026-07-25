import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ImagePlus, Camera, SlidersHorizontal } from 'lucide-react'
import {
  usePalettes,
  usePaints,
  useSaveRecipe,
  useSettings,
  useUpdateSettings,
} from '@/hooks/useAppData'
import { describeColor } from '@/lib/color'
import { findBestMix } from '@/lib/mixer'
import type { AveragingKernel, MaxPaints, MixResult, RGB } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PalettePicker } from '@/components/layout/PalettePicker'
import { ImageSampler } from '@/components/color/ImageSampler'
import { ColorReadout } from '@/components/color/ColorReadout'
import { MixResultCard } from '@/components/mix/MixResultCard'

export function MatchPage() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: palettes = [] } = usePalettes()
  const paletteId = settings?.activePaletteId
  const { data: paints = [] } = usePaints(paletteId)
  const saveRecipe = useSaveRecipe()

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [target, setTarget] = useState<RGB | null>(null)
  const [locked, setLocked] = useState<string[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [result, setResult] = useState<MixResult | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const palette = palettes.find((p) => p.id === paletteId)
  const targetInfo = useMemo(
    () => (target ? describeColor(target) : null),
    [target],
  )

  const runMix = (rgb: RGB) => {
    if (!settings || !palette) return
    const mix = findBestMix(rgb, paints, {
      maxPaints: settings.maxPaints,
      lockedPaintIds: locked,
      excludedPaintIds: excluded,
      prioritizeOpaque: settings.prioritizeOpaque,
      prioritizeTransparent: settings.prioritizeTransparent,
      mixingMode: settings.mixingMode,
      totalVolumeMl: settings.totalVolumeMl,
      totalDrops: settings.totalDrops,
      dropMl: settings.dropMl,
      densityGPerMl: settings.densityGPerMl,
    })
    setResult(mix)
  }

  const onFile = (file?: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setTarget(null)
    setResult(null)
  }

  return (
    <motion.div
      className="space-y-4 pb-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="space-y-3">
        <div>
          <CardTitle>Color match</CardTitle>
          <CardDescription>
            Select a palette, capture or upload a reference, then tap any pixel.
          </CardDescription>
        </div>
        <PalettePicker
          palettes={palettes}
          value={paletteId}
          onChange={(id) => updateSettings.mutate({ activePaletteId: id })}
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
      </Card>

      {imageUrl && settings ? (
        <ImageSampler
          imageUrl={imageUrl}
          kernel={settings.averagingKernel}
          onSample={(rgb) => {
            setTarget(rgb)
            runMix(rgb)
          }}
        />
      ) : null}

      {targetInfo ? <ColorReadout title="Sampled target" {...targetInfo} /> : null}

      <Card className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--color-accent)]" />
            <CardTitle>Advanced mixing</CardTitle>
          </div>
          <span className="text-xs text-[var(--color-muted)]">
            {showAdvanced ? 'Hide' : 'Show'}
          </span>
        </button>

        {showAdvanced && settings ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Max paints</Label>
              <div className="grid grid-cols-4 gap-2">
                {([2, 3, 4, 5] as MaxPaints[]).map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={settings.maxPaints === n ? 'default' : 'secondary'}
                    onClick={() => updateSettings.mutate({ maxPaints: n })}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Averaging kernel</Label>
              <div className="grid grid-cols-4 gap-2">
                {([1, 3, 5, 9] as AveragingKernel[]).map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={settings.averagingKernel === n ? 'default' : 'secondary'}
                    onClick={() => updateSettings.mutate({ averagingKernel: n })}
                  >
                    {n}×{n}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Prioritize opaque</Label>
              <Switch
                checked={settings.prioritizeOpaque}
                onCheckedChange={(v) =>
                  updateSettings.mutate({
                    prioritizeOpaque: v,
                    prioritizeTransparent: v ? false : settings.prioritizeTransparent,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Prioritize transparent</Label>
              <Switch
                checked={settings.prioritizeTransparent}
                onCheckedChange={(v) =>
                  updateSettings.mutate({
                    prioritizeTransparent: v,
                    prioritizeOpaque: v ? false : settings.prioritizeOpaque,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Additive mixing</Label>
              <Switch
                checked={settings.mixingMode === 'additive'}
                onCheckedChange={(v) =>
                  updateSettings.mutate({
                    mixingMode: v ? 'additive' : 'acrylic_subtractive',
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Lock / exclude paints</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {paints.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        type="button"
                        variant={locked.includes(p.id) ? 'default' : 'outline'}
                        onClick={() => {
                          setLocked((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id],
                          )
                          setExcluded((prev) => prev.filter((id) => id !== p.id))
                        }}
                      >
                        Lock
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant={excluded.includes(p.id) ? 'danger' : 'outline'}
                        onClick={() => {
                          setExcluded((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id],
                          )
                          setLocked((prev) => prev.filter((id) => id !== p.id))
                        }}
                      >
                        Exclude
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {target ? (
              <Button type="button" onClick={() => runMix(target)} className="w-full">
                Recompute mix
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      {result && target && targetInfo && palette && settings ? (
        <MixResultCard
          targetRgb={target}
          targetHex={targetInfo.hex}
          result={result}
          paletteName={palette.name}
          onSave={() => {
            void saveRecipe
              .mutateAsync({
                paletteId: palette.id,
                paletteName: palette.name,
                target: targetInfo,
                predicted: result.predicted,
                components: result.components,
                deltaE: result.deltaE,
                matchPercent: result.matchPercent,
                mixingMode: result.mixingMode,
                maxPaints: settings.maxPaints,
                imageThumb: imageUrl ?? undefined,
                favorite: false,
                totalMl: settings.totalVolumeMl,
                totalDrops: settings.totalDrops,
              })
              .then(() => {
                setSavedMsg('Mix saved to History')
                window.setTimeout(() => setSavedMsg(null), 2200)
              })
          }}
        />
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

      {!paletteId ? (
        <Card>
          <CardTitle>Choose a palette to begin</CardTitle>
          <CardDescription className="mt-1">
            Create or select a paint system in Palettes. Mixes never cross systems.
          </CardDescription>
        </Card>
      ) : null}
    </motion.div>
  )
}
