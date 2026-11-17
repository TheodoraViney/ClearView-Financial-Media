import { type ComponentProps } from 'react'

import { cx } from './cx'
import { EASE, type Motion } from './motion'

const VARIANTS = {
  default:
    'rounded-sm bg-white inset-ring inset-ring-input focus:inset-ring-focus aria-invalid:inset-ring-error',
  bare: 'h-full bg-transparent',
}

// Sizes of the default variant. `sm` is the subscribe pop-up field: 44 high, 12px sides, 2px focus ring.
const SIZES = {
  md: 'h-12.5 px-4',
  sm: 'h-11 px-3 focus:inset-ring-2',
}

// Opt-in hover ring (sponsorship enquiry form): `input-hover` on hover, focus and error rings still win.
const HOVER = 'hover:inset-ring-input-hover'

type InputSize = keyof typeof SIZES

/** The field look shared by `Input` (default variant) and `Textarea`. */
export function fieldClasses({ motion = 'smooth', hover = false }: { motion?: Motion; hover?: boolean } = {}) {
  return cx(
    'min-w-0 border-0 text-base leading-copy text-foreground outline-none transition-shadow placeholder:text-foreground/50',
    EASE[motion],
    hover && HOVER,
  )
}

export function Input({
  variant = 'default',
  size = 'md',
  // Ring easing, see motion.ts.
  motion = 'smooth',
  hover = false,
  className,
  ...props
}: { variant?: keyof typeof VARIANTS; size?: InputSize; motion?: Motion; hover?: boolean } & Omit<
  ComponentProps<'input'>,
  'size'
>) {
  return (
    <input
      {...props}
      className={cx(
        fieldClasses({ motion, hover: hover && variant === 'default' }),
        VARIANTS[variant],
        variant === 'default' && SIZES[size],
        className,
      )}
    />
  )
}

/** The default variant's ring classes, for `Textarea`. */
export const FIELD_RING = VARIANTS.default
