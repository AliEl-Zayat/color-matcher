import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FlaskConical, Heart, Save } from 'lucide-react'
import type { MixRecipe, MixResult, RGB } from '@/types'
import { buildDifferenceHeatmap, exportRecipePdf, exportRecipePng } from '@/lib/export'
import { toMinimumSampleRecipe } from '@/lib/mixer'
import { useSettings } from '@/hooks/useAppData'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ColorSwatch } from '@/components/color/ColorSwatch'
import { Badge } from '@/components/ui/badge'

export function MixResultCard({
  targetRgb,
  targetHex,
  result,
  paletteName,
  onSave,
  recipe,
  onToggleFavorite,
}: {
  targetRgb: RGB
  targetHex: string
  result: MixResult
  paletteName: string
  onSave?: () => void
  recipe?: MixRecipe
  onToggleFavorite?: () => void
}) {
  const exportRef = useRef<HTMLDivElement>(null)
  const heatmap = buildDifferenceHeatmap(targetRgb, result.predicted.rgb)
  const { data: settings } = useSettings()
  const [sampleMode, setSampleMode] = useState(false)

  const dropMl = settings?.dropMl ?? 0.05
  const density = settings?.densityGPerMl ?? 1.1

  const displayComponents = useMemo(() => {
    if (!sampleMode) return result.components
    return toMinimumSampleRecipe(result.components, dropMl, density)
  }, [density, dropMl, result.components, sampleMode])

  const totalDrops = displayComponents.reduce((s, c) => s + c.drops, 0)
  const totalMl = roundSum(displayComponents.map((c) => c.milliliters))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28 }}
    >
      <Card className="space-y-4">
        <div ref={exportRef} className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Suggested Mix</CardTitle>
              <CardDescription>
                Palette: {paletteName} ·{' '}
                {result.mixingMode === 'acrylic_subtractive' ? 'Acrylic' : 'Additive'}
              </CardDescription>
            </div>
            <Badge className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
              {result.matchPercent}% match
            </Badge>
          </div>

          {result.matchPercent < 45 ? (
            <p className="rounded-2xl border border-[var(--color-accent-2)]/25 bg-[var(--color-accent-2)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--color-foreground)]">
              Low match usually means this palette is missing pigments near the
              target. Brand tools like Golden use factory color data for their
              full line. Add the closest Golden (or other) hues into this
              palette from a swatch/HEX, set Max paints to 5, then recompute.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 text-center">
              <ColorSwatch hex={targetHex} size="xl" className="mx-auto" />
              <p className="text-xs text-[var(--color-muted)]">Target</p>
            </div>
            <div className="space-y-2 text-center">
              <ColorSwatch hex={result.predicted.hex} size="xl" className="mx-auto" />
              <p className="text-xs text-[var(--color-muted)]">Mixed</p>
            </div>
            <div className="space-y-2 text-center">
              <img
                src={heatmap}
                alt="Difference heatmap"
                className="mx-auto h-28 w-28 rounded-2xl border border-white/15 object-cover"
              />
              <p className="text-xs text-[var(--color-muted)]">ΔE {result.deltaE}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {sampleMode ? 'Minimum sample' : 'Full batch'}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {sampleMode
                  ? `${totalDrops} drops · ${totalMl} ml — test before filling`
                  : 'Uses volume / drops from Settings'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={sampleMode ? 'default' : 'secondary'}
              onClick={() => setSampleMode((v) => !v)}
              aria-pressed={sampleMode}
            >
              <FlaskConical className="h-4 w-4" />
              {sampleMode ? 'Full batch' : 'Min sample'}
            </Button>
          </div>

          <div className="space-y-2">
            {displayComponents.map((c) => (
              <div
                key={c.paintId}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5"
              >
                <ColorSwatch hex={c.hex} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.percent}% · {c.paintName}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {c.drops} drops · {c.milliliters} ml · {c.grams} g
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onSave ? (
            <Button onClick={onSave} className="flex-1">
              <Save className="h-4 w-4" /> Save mix
            </Button>
          ) : null}
          {onToggleFavorite && recipe ? (
            <Button variant="secondary" onClick={onToggleFavorite}>
              <Heart
                className="h-4 w-4"
                fill={recipe.favorite ? 'currentColor' : 'none'}
              />
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => exportRef.current && exportRecipePng(exportRef.current)}
          >
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (recipe) {
                exportRecipePdf({
                  ...recipe,
                  components: displayComponents,
                  totalMl,
                  totalDrops,
                })
              } else {
                exportRecipePdf({
                  id: 'preview',
                  paletteId: '',
                  paletteName,
                  target: {
                    rgb: targetRgb,
                    hex: targetHex,
                    hsv: { h: 0, s: 0, v: 0 },
                    hsl: { h: 0, s: 0, l: 0 },
                    lab: { l: 0, a: 0, b: 0 },
                  },
                  predicted: result.predicted,
                  components: displayComponents,
                  deltaE: result.deltaE,
                  matchPercent: result.matchPercent,
                  mixingMode: result.mixingMode,
                  maxPaints: 4,
                  favorite: false,
                  totalMl,
                  totalDrops,
                  createdAt: Date.now(),
                  notes: sampleMode ? 'Minimum sample batch' : undefined,
                })
              }
            }}
          >
            PDF
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

function roundSum(values: number[]): number {
  return Math.round(values.reduce((s, v) => s + v, 0) * 1000) / 1000
}
