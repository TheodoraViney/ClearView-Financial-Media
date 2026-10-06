import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { CHEVRON, type Motion } from './motion'

const VARIANTS = {
  accent: { base: 'text-accent', hover: 'hover:text-accent-hover' },
  default: { base: 'text-foreground', hover: '' },
}

// Renders as a span when the whole card is already the link.
export function ArrowLink({
  href,
  variant = 'default',
  // Chevron shift, see motion.ts.
  motion = 'smooth',
  // `false` keeps the colour on hover, where the design moves only the chevron.
  hoverColor = true,
  className,
  children,
}: {
  href?: string
  variant?: keyof typeof VARIANTS
  motion?: Motion
  hoverColor?: boolean
  className?: string
  children: ReactNode
}) {
  const classes = cx(
    'group inline-flex min-h-11 items-center gap-2 self-start text-sm leading-none whitespace-nowrap lg:min-h-0',
    VARIANTS[variant].base,
    hoverColor && VARIANTS[variant].hover,
    className,
  )

  const content = (
    <>
      {children}
      <Icon name="chevron-right" className={CHEVRON[motion]} />
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
