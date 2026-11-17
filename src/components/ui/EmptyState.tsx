import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

/**
 * Empty state, two looks:
 * - `panel` (search results design, `search-empty-state`): a centred panel on the brand tint with the magnifier
 *   wandering over it (`animate-search-scan`, still with reduced motion), a 20/24 title, grey text up to 480px and an
 *   optional action (the caller's button, e.g. `Button variant="outline-accent" size="compact"`). `role="status"`, so a
 *   search that comes back empty is announced.
 * - `plain` (shared listings `results-empty`): left-aligned between two rules, 40px above and below, no icon, title,
 *   text and action 16px apart. No role: the caller announces the result count.
 * The caller sets the margin.
 */
export function EmptyState({
  title,
  text,
  action,
  variant = 'panel',
  titleAs: Title = 'h2',
  className,
}: {
  title: string
  text: string
  action?: ReactNode
  variant?: 'panel' | 'plain'
  /** The title's heading level. */
  titleAs?: 'h2' | 'h3'
  className?: string
}) {
  if (variant === 'plain') {
    return (
      <section className={cx('flex flex-col items-start gap-4 border-y border-border py-10', className)}>
        <Title className="text-title-lg font-medium">{title}</Title>
        <p className="text-base leading-copy text-pretty wrap-anywhere text-grey">{text}</p>
        {action}
      </section>
    )
  }

  return (
    <section
      role="status"
      className={cx(
        'flex flex-col items-center rounded-sm bg-surface-hover px-6 py-10 text-center inset-ring inset-ring-accent-subtle md:px-8 md:py-16',
        className,
      )}
    >
      <span aria-hidden="true" className="flex size-24 shrink-0 items-center justify-center">
        <Icon name="search" className="size-12 animate-search-scan overflow-visible text-accent motion-reduce:animate-none" />
      </span>
      <Title className="mt-6 text-title-lg font-medium">{title}</Title>
      <p className="mt-3 max-w-120 text-base leading-copy text-pretty wrap-anywhere text-grey">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
