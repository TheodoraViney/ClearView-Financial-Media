import Link from 'next/link'

import { cx } from './cx'

export type BreadcrumbItem = {
  label: string
  href?: string | null
  /** An item without href in the trail's grey instead of dark (company profile "Industry Engagement" without a link). */
  muted?: boolean
}

// "Home / News / Strategy". Items with an href are links; an item without one renders as plain dark text, or grey
// with `muted`.
// `darkLast` sets the last item in the dark text colour even when it is a link (awards programme: "Home / Awards",
// where Awards links to the listing); it keeps the accent hover.
export function Breadcrumb({
  items,
  darkLast = false,
  className,
}: {
  items: BreadcrumbItem[]
  darkLast?: boolean
  className?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className={cx('text-caption leading-none text-grey', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          // The last item is the current page.
          const current = index === items.length - 1 ? ('page' as const) : undefined
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-border-plus">
                  /
                </span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={current}
                  className={cx(
                    'transition-colors duration-180 ease-out hover:text-accent',
                    darkLast && index === items.length - 1 && 'text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current} className={item.muted ? undefined : 'text-foreground'}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
