import Link from 'next/link'

import { cx } from './cx'
import { TAB_CURRENT, TAB_IDLE, TAB_ITEM, TAB_ROW } from './tab-classes'

export type TabLinkItem = { key: string; label: string; href: string; current: boolean }

/**
 * Tabs that are links to other pages (shared listings Awards | Events | Research), with the `SectionNav` look: the
 * current one is the open page (`aria-current="page"`), not a JS tablist. 32px apart, 24 below md. The 2px bar of the
 * current item covers the rule under the row, as the design. Server component: no JavaScript.
 */
export function TabLinks({ items, label, className }: { items: TabLinkItem[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cx('relative w-full min-w-0 border-b border-border', className)}>
      <ul className={cx(TAB_ROW, '-mb-px gap-6 md:gap-8')}>
        {items.map((item) => (
          <li key={item.key} className="flex shrink-0">
            <Link
              href={item.href}
              prefetch={false}
              aria-current={item.current ? 'page' : undefined}
              className={cx(TAB_ITEM, item.current ? TAB_CURRENT : TAB_IDLE)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
