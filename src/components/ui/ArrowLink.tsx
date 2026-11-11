import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { CHEVRON, type Motion } from './motion'

const VARIANTS = {
  accent: { base: 'text-accent', hover: 'hover:text-accent-hover' },
  default: { base: 'text-foreground', hover: '' },
}

// `shift` (the default): the chevron moves on hover (`motion`), the colour changes unless `hoverColor` is false;
// the 44px touch target applies below lg only.
// `fade`: the whole link fades to 60% over 180ms ease-out and the chevron stays still. The 44px target applies on
// every breakpoint and its overhang is taken back with negative vertical margins (44 - 14 = 30, 15 each side), so the
// row it sits in keeps the text height (sponsored content header and company profile link).
// `static`: no hover of its own and no touch target, for the label inside a whole-card link (the card is the target
// and carries the hover); use it without `href`.
const HOVERS = {
  shift: 'min-h-11 lg:min-h-0',
  fade: 'min-h-11 -my-3.75 transition-opacity duration-180 ease-out hover:opacity-60',
  static: '',
}

// Renders as a span when the whole card is already the link.
export function ArrowLink({
  href,
  variant = 'default',
  hover = 'shift',
  // Chevron shift, see motion.ts. Ignored with `hover="fade"`.
  motion = 'smooth',
  // `false` keeps the colour on hover, where the design moves only the chevron. Ignored with `hover="fade"`.
  hoverColor = true,
  className,
  children,
}: {
  href?: string
  variant?: keyof typeof VARIANTS
  hover?: keyof typeof HOVERS
  motion?: Motion
  hoverColor?: boolean
  className?: string
  children: ReactNode
}) {
  const shift = hover === 'shift'
  const classes = cx(
    'group inline-flex items-center gap-2 self-start text-sm leading-none whitespace-nowrap',
    HOVERS[hover],
    VARIANTS[variant].base,
    shift && hoverColor && VARIANTS[variant].hover,
    className,
  )

  const content = (
    <>
      {children}
      <Icon name="chevron-right" className={shift ? CHEVRON[motion] : undefined} />
    </>
  )

  if (href === undefined) {
    return <span className={classes}>{content}</span>
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}
