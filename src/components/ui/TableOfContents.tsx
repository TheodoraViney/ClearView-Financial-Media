import type { TocItem } from '@/lib/heading-anchors'

import { cx } from './cx'
import { Icon } from './Icon'
import { TableOfContentsScroll } from './TableOfContentsScroll.client'

type Group = TocItem & { children: TocItem[] }

/** H3 entries nest under the H2 before them; an H3 before any H2 starts a group of its own. */
function groupItems(items: TocItem[]): Group[] {
  const groups: Group[] = []

  for (const item of items) {
    const last = groups.at(-1)

    if (item.level === 3 && last) {
      last.children.push(item)
    } else {
      groups.push({ ...item, children: [] })
    }
  }

  return groups
}

const LINK = 'transition-opacity duration-180 ease-out text-pretty hover:opacity-60'

function Entries({ groups, className, itemClassName }: { groups: Group[]; className?: string; itemClassName?: string }) {
  return (
    <ol className={cx('flex flex-col gap-3', className)}>
      {groups.map((group) => (
        <li key={group.id} className={cx('flex flex-col gap-2', itemClassName)}>
          <a href={`#${group.id}`} data-toc-link="" className={cx('text-sm leading-copy text-foreground', LINK)}>
            {group.label}
          </a>
          {group.children.length > 0 && (
            <ol className="flex flex-col gap-2 pl-3">
              {group.children.map((child) => (
                <li key={child.id} className="flex">
                  <a href={`#${child.id}`} data-toc-link="" className={cx('text-caption text-grey', LINK)}>
                    {child.label}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * The headings of a long page as in-page links (shared-shell table-of-contents): H2 entries 14/19.6 dark, their H3
 * entries 13/18.2 grey 12px in; links fade to 60% on hover and scroll smoothly (TableOfContentsScroll). No scrollspy.
 * - `rail`: the 13px 500 grey title, then the list behind a 1px rule, entries 16px in, 12 between groups.
 * - `stacked`: a closed `<details>` (1px rule, 4px radius): a 44px summary with the title (14/14 500) and a 12 × 7
 *   chevron that turns over when open, then the list (padding 4 / 16 / 16).
 * `title` is the visible label and the navigation's accessible name.
 */
export function TableOfContents({
  items,
  title,
  layout,
  className,
}: {
  items: TocItem[]
  title: string
  layout: 'rail' | 'stacked'
  className?: string
}) {
  const groups = groupItems(items)

  if (groups.length === 0) {
    return null
  }

  return (
    <nav aria-label={title} className={cx('min-w-0', className)}>
      <TableOfContentsScroll />
      {layout === 'rail' ? (
        <div className="flex flex-col gap-4">
          <span aria-hidden="true" className="text-caption leading-none font-medium text-grey">
            {title}
          </span>
          <Entries groups={groups} className="border-l border-border" itemClassName="pl-4" />
        </div>
      ) : (
        <details className="group rounded-sm border border-border bg-white">
          <summary className="flex min-h-11 cursor-pointer details-marker-none items-center justify-between gap-4 px-4 text-sm leading-none font-medium text-foreground">
            <span>{title}</span>
            <Icon
              name="disclosure-chevron"
              className="text-grey transition-transform duration-180 ease-out group-open:rotate-180"
            />
          </summary>
          <Entries groups={groups} className="px-4 pt-1 pb-4" />
        </details>
      )}
    </nav>
  )
}
