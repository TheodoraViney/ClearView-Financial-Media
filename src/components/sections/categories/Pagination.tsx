import Link from 'next/link'

import { cx } from '@/components/ui/cx'
import { Icon } from '@/components/ui/Icon'
import type { CategoriesView } from '@/lib/categories'

const STEP = 'group inline-flex min-h-11 items-center gap-2 text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60'

/**
 * The page window (36px squares, the current one filled in the accent, ellipses) on the left; Previous and Next on
 * the right, each hidden at its end. Hidden when the list fits on one page.
 */
export function Pagination({
  pagination,
  previousLabel,
  nextLabel,
  className,
}: {
  pagination: CategoriesView['pagination']
  previousLabel: string
  nextLabel: string
  className?: string
}) {
  if (pagination.total <= 1) {
    return null
  }

  return (
    <nav
      aria-label="Pagination"
      className={cx('flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border pt-8', className)}
    >
      <ol className="flex items-center gap-1">
        {pagination.pages.map((item, index) =>
          item ? (
            <li key={item.page} className="flex">
              <Link
                href={item.href}
                aria-label={`Page ${item.page}`}
                aria-current={item.current ? 'page' : undefined}
                className={cx(
                  'flex size-9 shrink-0 items-center justify-center rounded-sm text-sm leading-none transition duration-180 ease-out hover:inset-ring hover:inset-ring-accent',
                  item.current ? 'bg-accent text-white' : 'text-foreground',
                )}
              >
                {item.page}
              </Link>
            </li>
          ) : (
            <li key={`ellipsis-${index}`} aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center text-sm leading-none text-grey">
              …
            </li>
          ),
        )}
      </ol>
      <div className="ml-auto flex items-center gap-6">
        {pagination.previousHref && (
          <Link href={pagination.previousHref} aria-label="Previous page" className={STEP}>
            <Icon name="chevron-left" />
            {previousLabel}
          </Link>
        )}
        {pagination.nextHref && (
          <Link href={pagination.nextHref} aria-label="Next page" className={STEP}>
            {nextLabel}
            <Icon name="chevron-right" />
          </Link>
        )}
      </div>
    </nav>
  )
}
