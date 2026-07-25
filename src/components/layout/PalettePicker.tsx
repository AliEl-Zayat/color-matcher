import { PAINT_TYPE_LABELS } from '@/types'
import type { Palette } from '@/types'
import { Label } from '@/components/ui/label'

export function PalettePicker({
  palettes,
  value,
  onChange,
}: {
  palettes: Palette[]
  value: string | null | undefined
  onChange: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Paint palette</Label>
      <select
        className="h-12 w-full rounded-xl border border-white/10 bg-[#121821] px-3 text-sm font-medium"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select a compatible palette
        </option>
        {palettes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {PAINT_TYPE_LABELS[p.paintType]}
          </option>
        ))}
      </select>
      <p className="text-xs text-[var(--color-muted)]">
        Mixing never combines paints across palettes.
      </p>
    </div>
  )
}
