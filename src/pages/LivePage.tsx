import { useCallback, useMemo, useState } from 'react'
import {
  usePalettes,
  usePaints,
  useSaveRecipe,
  useSettings,
  useUpdateSettings,
} from '@/hooks/useAppData'
import { describeColor } from '@/lib/color'
import { findBestMix } from '@/lib/mixer'
import type { MixResult, RGB } from '@/types'
import { LiveCamera } from '@/components/camera/LiveCamera'
import { PalettePicker } from '@/components/layout/PalettePicker'
import { ColorReadout } from '@/components/color/ColorReadout'
import { MixResultCard } from '@/components/mix/MixResultCard'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'

export function LivePage() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: palettes = [] } = usePalettes()
  const paletteId = settings?.activePaletteId
  const { data: paints = [] } = usePaints(paletteId)
  const saveRecipe = useSaveRecipe()
  const palette = palettes.find((p) => p.id === paletteId)

  const [running, setRunning] = useState(true)
  const [target, setTarget] = useState<RGB | null>(null)
  const [result, setResult] = useState<MixResult | null>(null)
  const [thumb, setThumb] = useState<string | undefined>()

  const targetInfo = useMemo(
    () => (target ? describeColor(target) : null),
    [target],
  )

  const onSample = useCallback(
    (rgb: RGB) => {
      setTarget(rgb)
      if (!settings || !paletteId || paints.length === 0) {
        setResult(null)
        return
      }
      const mix = findBestMix(rgb, paints, {
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
      setResult(mix)
    },
    [paletteId, paints, settings],
  )

  return (
    <div className="space-y-4 pb-4">
      <Card className="space-y-3">
        <div>
          <CardTitle>Live camera match</CardTitle>
          <CardDescription>
            Continuous reticle sampling. Recommendations update in real time.
          </CardDescription>
        </div>
        <PalettePicker
          palettes={palettes}
          value={paletteId}
          onChange={(id) => updateSettings.mutate({ activePaletteId: id })}
        />
      </Card>

      {settings ? (
        <LiveCamera
          kernel={settings.averagingKernel}
          running={running && Boolean(paletteId)}
          onRunningChange={setRunning}
          onSample={onSample}
          onCapture={setThumb}
        />
      ) : null}

      {targetInfo ? <ColorReadout title="Live sample" {...targetInfo} /> : null}

      {result && target && targetInfo && palette && settings ? (
        <MixResultCard
          targetRgb={target}
          targetHex={targetInfo.hex}
          result={result}
          paletteName={palette.name}
          onSave={() => {
            void saveRecipe.mutateAsync({
              paletteId: palette.id,
              paletteName: palette.name,
              target: targetInfo,
              predicted: result.predicted,
              components: result.components,
              deltaE: result.deltaE,
              matchPercent: result.matchPercent,
              mixingMode: result.mixingMode,
              maxPaints: settings.maxPaints,
              imageThumb: thumb,
              favorite: false,
              totalMl: settings.totalVolumeMl,
              totalDrops: settings.totalDrops,
            })
          }}
        />
      ) : null}
    </div>
  )
}
