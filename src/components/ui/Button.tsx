import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon, type IconName } from './Icon'
import { CHEVRON, EASE, type Motion } from './motion'

/** Screen-reader-only words after a link's label when it opens a new tab (WCAG 3.2.5 advisory, G201). */
export const NEW_TAB_TEXT = ' (opens in a new tab)'

const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  outline:
    'inset-ring inset-ring-secondary text-foreground hover:bg-secondary hover:text-white',
  'outline-inverse': 'inset-ring inset-ring-white text-white hover:bg-white/20',
  // Brand-coloured label and ring (Subscribe in the publication mobile menu).
  'outline-accent': 'inset-ring inset-ring-accent text-accent hover:bg-accent hover:text-white',
  // Accent ring and label on white, the brand tint on hover (shared listings empty state "Clear filters").
  'outline-accent-tint': 'bg-white inset-ring inset-ring-accent text-accent hover:bg-surface-hover',
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

// Side padding: 16 by default, 20 where the design draws it (research report "Download report", primary-button).
const PADDINGS = {
  default: 'px-4',
  wide: 'px-5',
}

export type ButtonVariant = keyof typeof VARIANTS
export type ButtonSize = keyof typeof SIZES
export type ButtonPadding = keyof typeof PADDINGS

/** The button look, shared with the client `ActionButton`. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  motion = 'smooth',
  padding = 'default',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  motion?: Motion
  padding?: ButtonPadding
  className?: string
}): string {
  return cx(
    `group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm ${PADDINGS[padding]} text-sm leading-none transition-colors`,
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
  /** Opt-in: an icon before the label (research report download). */
  icon?: IconName
  /** Opt-in: 20px side padding instead of 16. */
  padding?: ButtonPadding
  className?: string
  children: ReactNode
} & (
  // `newTab` (opt-in, with href): a plain anchor that opens in a new tab, for an outside form or PDF.
  | { href: string; type?: never; newTab?: boolean }
  | { href?: never; type?: 'button' | 'submit'; newTab?: never }
)

export function Button({
  variant = 'primary',
  size = 'md',
  arrow = false,
  fullWidth = false,
  motion = 'smooth',
  icon,
  padding = 'default',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, fullWidth, motion, padding, className })

  const content = (
    <>
      {icon && <Icon name={icon} />}
      {children}
      {arrow && (
        <Icon name="chevron-right" className={CHEVRON[motion]} />
      )}
    </>
  )

  if (rest.href !== undefined && rest.newTab) {
    return (
      <a href={rest.href} target="_blank" rel="noopener" className={classes}>
        {content}
        <span className="sr-only">{NEW_TAB_TEXT}</span>
      </a>
    )
  }

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
