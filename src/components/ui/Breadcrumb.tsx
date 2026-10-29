import Link from 'next/link'

import { cx } from './cx'

export type BreadcrumbItem = { label: string; href?: string | null }

// "Home / News / Strategy". Items with an href are links; an item without one renders as plain dark text.
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
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
              <Link href={item.href} className="transition-colors duration-180 ease-out hover:text-accent">
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
