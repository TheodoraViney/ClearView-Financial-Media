import { type ComponentProps } from 'react'

import { cx } from './cx'
import { EASE, type Motion } from './motion'

const VARIANTS = {
  default:
    'h-12.5 rounded-sm bg-white px-4 inset-ring inset-ring-input focus:inset-ring-focus aria-invalid:inset-ring-error',
  bare: 'h-full bg-transparent',
}

export function Input({
  variant = 'default',
  // Ring easing, see motion.ts.
  motion = 'smooth',
  className,
  ...props
}: { variant?: keyof typeof VARIANTS; motion?: Motion } & Omit<ComponentProps<'input'>, 'size'>) {
  return (
    <input
      {...props}
      className={cx(
        'min-w-0 border-0 text-base leading-copy text-foreground outline-none transition-shadow placeholder:text-foreground/50',
        EASE[motion],
        VARIANTS[variant],
        className,
      )}
    />
  )
}
