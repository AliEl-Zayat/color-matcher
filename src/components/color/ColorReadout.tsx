import type { HSL, HSV, LAB, RGB } from '@/types'
import { Card } from '@/components/ui/card'
import { ColorSwatch } from '@/components/color/ColorSwatch'

export function ColorReadout({
  title,
  hex,
  rgb,
  hsv,
  hsl,
  lab,
}: {
  title: string
  hex: string
  rgb: RGB
  hsv: HSV
  hsl: HSL
  lab: LAB
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <ColorSwatch hex={hex} size="lg" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {title}
          </p>
          <p className="text-xl font-semibold">{hex}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-muted)] sm:grid-cols-3">
        <div>
          <p className="font-semibold text-white">RGB</p>
          <p>
            {rgb.r} {rgb.g} {rgb.b}
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">HSV</p>
          <p>
            {hsv.h}° {hsv.s}% {hsv.v}%
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">HSL</p>
          <p>
            {hsl.h}° {hsl.s}% {hsl.l}%
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">LAB</p>
          <p>
            {lab.l} {lab.a} {lab.b}
          </p>
        </div>
      </div>
    </Card>
  )
}
