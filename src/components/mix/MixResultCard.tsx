import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Download, Heart, Save } from 'lucide-react'
import type { MixRecipe, MixResult, RGB } from '@/types'
import { buildDifferenceHeatmap, exportRecipePdf, exportRecipePng } from '@/lib/export'
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
              Palette: {paletteName} · {result.mixingMode === 'acrylic_subtractive' ? 'Acrylic' : 'Additive'}
            </CardDescription>
          </div>
          <Badge className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
            {result.matchPercent}% match
          </Badge>
        </div>

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

        <div className="space-y-2">
          {result.components.map((c) => (
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
            if (recipe) exportRecipePdf(recipe)
            else {
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
                components: result.components,
                deltaE: result.deltaE,
                matchPercent: result.matchPercent,
                mixingMode: result.mixingMode,
                maxPaints: 4,
                favorite: false,
                totalMl: result.components.reduce((s, c) => s + c.milliliters, 0),
                totalDrops: result.components.reduce((s, c) => s + c.drops, 0),
                createdAt: Date.now(),
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
