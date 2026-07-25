import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-white/10 transition-colors data-[state=checked]:bg-[var(--color-accent)]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-[#062421]',
        )}
      />
    </SwitchPrimitives.Root>
  )
}
