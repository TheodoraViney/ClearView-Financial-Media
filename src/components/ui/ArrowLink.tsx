import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

const VARIANTS = {
  accent: 'text-accent hover:text-accent-hover',
  default: 'text-foreground',
}

// Renders as a span when the whole card is already the link.
export function ArrowLink({
  href,
  variant = 'default',
  className,
  children,
}: {
  href?: string
  variant?: keyof typeof VARIANTS
  className?: string
  children: ReactNode
}) {
  const classes = cx(
    'group inline-flex min-h-11 items-center gap-2 self-start text-sm leading-none whitespace-nowrap lg:min-h-0',
    VARIANTS[variant],
    className,
  )

  const content = (
    <>
      {children}
      <Icon
        name="chevron-right"
        className="transition-transform duration-180 ease-smooth group-hover:translate-x-0.75"
      />
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
