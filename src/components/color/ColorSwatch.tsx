import { contrastText } from '@/lib/color'
import { cn } from '@/lib/utils'

export function ColorSwatch({
  hex,
  size = 'md',
  className,
  label,
}: {
  hex: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}) {
  const dims =
    size === 'sm'
      ? 'h-8 w-8'
      : size === 'md'
        ? 'h-12 w-12'
        : size === 'lg'
          ? 'h-20 w-20'
          : 'h-28 w-28'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-inner',
        dims,
        className,
      )}
      style={{ backgroundColor: hex }}
      title={hex}
    >
      {label ? (
        <span
          className="absolute inset-x-0 bottom-0 bg-black/25 px-1 py-0.5 text-center text-[9px] font-semibold"
          style={{ color: contrastText(hex) }}
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}
