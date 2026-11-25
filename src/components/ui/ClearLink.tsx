import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

/**
 * "Clear filters" with the 7 × 12 chevron (Company Engagement filters and empty state): 400 14/14 in the accent, 8px to
 * the chevron, fading to 60% on hover over 180ms ease-out. A 44px target; the caller takes back its overhang with
 * negative vertical margins where the row is shorter. Keeps the scroll position, like the filters it clears.
 */
export function ClearLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 self-start text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60',
        className,
      )}
    >
      {children}
      <Icon name="chevron-right" />
    </Link>
  )
}
