import Link from 'next/link'

import { cx } from './cx'

export type BreadcrumbItem = { label: string; href?: string | null }

// "Home / News / Strategy". Items with an href are links; an item without one renders as plain dark text.
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
        {items.map((item, index) => (
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
                className={cx(
                  'transition-colors duration-180 ease-out hover:text-accent',
                  darkLast && index === items.length - 1 && 'text-foreground',
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
