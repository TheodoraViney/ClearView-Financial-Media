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
// `tone="inverse"` is the trail on a dark photo (About hero): every item white, separators white/40, links fade to 70%
// on hover, and a white focus outline.
const TONES = {
  default: {
    nav: 'text-grey',
    separator: 'text-border-plus',
    link: 'transition-colors duration-180 ease-out hover:text-accent',
    text: 'text-foreground',
  },
  inverse: {
    nav: 'text-white',
    separator: 'text-white/40',
    link: 'transition-opacity duration-180 ease-out hover:opacity-70 focus-visible:outline-white',
    text: '',
  },
}

export function Breadcrumb({
  items,
  darkLast = false,
  tone = 'default',
  className,
}: {
  items: BreadcrumbItem[]
  darkLast?: boolean
  tone?: keyof typeof TONES
  className?: string
}) {
  const look = TONES[tone]

  return (
    <nav aria-label="Breadcrumb" className={cx('text-caption leading-none', look.nav, className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          // The last item is the current page.
          const current = index === items.length - 1 ? ('page' as const) : undefined
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className={look.separator}>
                  /
                </span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={current}
                  className={cx(look.link, darkLast && index === items.length - 1 && look.text)}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current} className={item.muted ? undefined : look.text || undefined}>
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
