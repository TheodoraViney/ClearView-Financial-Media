import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { CHEVRON, EASE, type Motion } from './motion'

const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  outline:
    'inset-ring inset-ring-secondary text-foreground hover:bg-secondary hover:text-white',
  'outline-inverse': 'inset-ring inset-ring-white text-white hover:bg-white/20',
  // Brand-coloured label and ring (Subscribe in the publication mobile menu).
  'outline-accent': 'inset-ring inset-ring-accent text-accent hover:bg-accent hover:text-white',
  // Thin neutral ring, accent ring and label on hover (article Share and Copy link).
  subtle: 'bg-white inset-ring inset-ring-border text-foreground hover:inset-ring-accent hover:text-accent',
}

// 44px is the minimum touch target; the stacked newsletter button is 48px.
const SIZES = {
  md: 'h-11',
  lg: 'h-12',
  // 44 on touch layouts, 40 from the header breakpoint (article actions).
  compact: 'h-11 header:h-10',
}

export type ButtonVariant = keyof typeof VARIANTS
export type ButtonSize = keyof typeof SIZES

/** The button look, shared with the client `ActionButton`. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  motion = 'smooth',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  motion?: Motion
  className?: string
}): string {
  return cx(
    'group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm px-4 text-sm leading-none transition-colors',
    EASE[motion],
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )
}

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  arrow?: boolean
  fullWidth?: boolean
  // Hover easing and chevron shift, see motion.ts.
  motion?: Motion
  className?: string
  children: ReactNode
} & (
  | { href: string; type?: never }
  | { href?: never; type?: 'button' | 'submit' }
)

export function Button({
  variant = 'primary',
  size = 'md',
  arrow = false,
  fullWidth = false,
  motion = 'smooth',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, fullWidth, motion, className })

  const content = (
    <>
      {children}
      {arrow && (
        <Icon name="chevron-right" className={CHEVRON[motion]} />
      )}
    </>
  )

  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type={rest.type ?? 'button'} className={classes}>
      {content}
    </button>
  )
}
