import Link from 'next/link'
import { type MouseEventHandler } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

/**
 * shared-shell filter-chip as a link: the href applies the filter (GET, no JavaScript needed) and `scroll={false}`
 * keeps the reader in place. 44px high below the header breakpoint (touch), 36 from it. Selected: accent fill, white
 * 500 label and a tick, `aria-current="true"`. The count shows at 70% opacity; screen readers hear
 * "{label}, {count} results" (`countLabel` overrides the second part).
 *
 * With `onClick` instead of `href` it is a toggle button for client-side filtering (awards programme winners):
 * `aria-pressed` in place of `aria-current`, same look. Use it from a client component.
 */
export function FilterChip({
  href,
  onClick,
  label,
  count,
  countLabel,
  selected = false,
}: (
  | { href: string; onClick?: never }
  | { href?: never; onClick: MouseEventHandler<HTMLButtonElement> }
) & {
  label: string
  count?: number
  /** Accessible text for the count, e.g. "13 results"; defaults to English. */
  countLabel?: string
  selected?: boolean
}) {
  const hasCount = count !== undefined
  const className = cx(
    'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm leading-none whitespace-nowrap inset-ring transition duration-180 ease-out hover:inset-ring-accent header:h-9',
    selected ? 'bg-accent font-medium text-white inset-ring-accent' : 'bg-white text-foreground inset-ring-border',
  )

  const content = (
    <>
      {selected && <Icon name="check-sm" className="-mr-0.5 shrink-0" />}
      <span>{label}</span>
      {hasCount && (
        <>
          <span aria-hidden="true" className="tabular-nums opacity-70">
            {count}
          </span>
          <span className="sr-only">, {countLabel ?? `${count} ${count === 1 ? 'result' : 'results'}`}</span>
        </>
      )}
    </>
  )

  if (href === undefined) {
    return (
      <button type="button" aria-pressed={selected} onClick={onClick} className={cx(className, 'cursor-pointer')}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href} prefetch={false} scroll={false} aria-current={selected ? 'true' : undefined} className={className}>
      {content}
    </Link>
  )
}
