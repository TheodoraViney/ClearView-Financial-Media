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
}

// 44px is the minimum touch target; the stacked newsletter button is 48px.
const SIZES = {
  md: 'h-11',
  lg: 'h-12',
}

export type ButtonVariant = keyof typeof VARIANTS

type ButtonProps = {
  variant?: ButtonVariant
  size?: keyof typeof SIZES
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
  const classes = cx(
    'group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm px-4 text-sm leading-none transition-colors',
    EASE[motion],
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )

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
