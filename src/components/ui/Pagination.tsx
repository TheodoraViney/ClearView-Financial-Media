import Link from 'next/link'

import { cx } from './cx'
import { Icon } from './Icon'

/** One numbered page; `null` in the list is an ellipsis. */
export type PaginationPage = { page: number; href: string; current: boolean }

// Page squares: 36px everywhere (`fixed`), or 44 below the header breakpoint and 36 from it (`touch`, search).
const SIZES = {
  fixed: 'size-9',
  touch: 'size-11 header:size-9',
}

const STEP =
  'group inline-flex min-h-11 items-center gap-2 text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60'

/**
 * shared-shell pagination: the page window (squares, the current one filled in the accent, ellipses) on the left;
 * Previous and Next on the right, each hidden at its end. Renders nothing for a single page. Plain links (GET), so it
 * works in server components and without JavaScript; the caller builds the hrefs and the window
 * (`pageWindow()` in src/lib/categories.ts).
 */
export function Pagination({
  pages,
  previousHref,
  nextHref,
  previousLabel,
  nextLabel,
  label = 'Pagination',
  size = 'fixed',
  strongCurrent = false,
  className,
}: {
  pages: (PaginationPage | null)[]
  previousHref: string | null
  nextHref: string | null
  previousLabel: string
  nextLabel: string
  /** Accessible name of the nav. */
  label?: string
  size?: keyof typeof SIZES
  /** The current page's number in weight 500 (search design). */
  strongCurrent?: boolean
  className?: string
}) {
  if (pages.length <= 1) {
    return null
  }

  return (
    <nav aria-label={label} className={cx('flex flex-wrap items-center justify-between gap-x-8 gap-y-4', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {pages.map((item, index) =>
          item ? (
            <li key={item.page} className="flex">
              <Link
                href={item.href}
                prefetch={false}
                aria-label={`Page ${item.page}`}
                aria-current={item.current ? 'page' : undefined}
                className={cx(
                  'flex shrink-0 items-center justify-center rounded-sm text-sm leading-none transition duration-180 ease-out hover:inset-ring hover:inset-ring-accent',
                  SIZES[size],
                  item.current ? 'bg-accent text-white' : 'text-foreground',
                  item.current && strongCurrent && 'font-medium',
                )}
              >
                {item.page}
              </Link>
            </li>
          ) : (
            <li
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className={cx('flex shrink-0 items-center justify-center text-sm leading-none text-grey', SIZES[size])}
            >
              …
            </li>
          ),
        )}
      </ol>
      <div className="ml-auto flex items-center gap-6">
        {previousHref && (
          <Link href={previousHref} prefetch={false} aria-label="Previous page" className={STEP}>
            <Icon name="chevron-left" />
            {previousLabel}
          </Link>
        )}
        {nextHref && (
          <Link href={nextHref} prefetch={false} aria-label="Next page" className={STEP}>
            {nextLabel}
            <Icon name="chevron-right" />
          </Link>
        )}
      </div>
    </nav>
  )
}
