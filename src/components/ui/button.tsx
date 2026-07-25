import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-accent)] text-[#062421] hover:brightness-110 shadow-[0_8px_24px_rgba(61,214,198,0.22)]',
        secondary:
          'glass text-[var(--color-foreground)] hover:bg-white/10',
        ghost: 'hover:bg-white/8 text-[var(--color-foreground)]',
        danger: 'bg-[var(--color-danger)]/90 text-white hover:brightness-110',
        outline:
          'border border-white/15 bg-transparent hover:bg-white/5 text-[var(--color-foreground)]',
      },
      size: {
        default: 'h-11 px-4 py-2 min-w-[44px]',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-2xl px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
