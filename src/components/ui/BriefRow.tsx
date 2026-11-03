import Link from 'next/link'

import { Meta } from './Meta'

/**
 * One News in Brief row (WB v2.0 `news-brief-item`), an `li` for a list with a top rule: a 6px dot in the brand focus
 * colour, the h3 headline (16/1.4, links to the post, accent on hover), "category | date" (13/1.3) and the brief below
 * the headline (16/22.4 grey, clamped to three lines with an ellipsis on every breakpoint, the full text stays in the
 * DOM; none when empty). From md the meta sits on the right of the headline; below md it goes under it. Rows are 24 0
 * with a rule between them.
 */
export function BriefRow({
  href,
  title,
  meta,
  text,
}: {
  href: string | null
  title: string
  meta: string[]
  text?: string | null
}) {
  return (
    <li className="grid grid-cols-brief-sm items-baseline gap-x-4 gap-y-2 border-b border-border py-6 last:border-b-0 md:grid-cols-brief md:gap-y-3">
      <span aria-hidden="true" className="block size-1.5 -translate-y-0.5 rounded-full bg-focus" />
      <h3 className="min-w-0 text-base leading-copy font-medium text-pretty text-foreground">
        {href ? (
          <Link href={href} className="transition-colors duration-180 ease-out hover:text-accent">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {meta.length > 0 && <Meta items={meta} className="leading-title max-md:col-start-2" />}
      {text && <p className="col-start-2 line-clamp-3 min-w-0 text-base leading-copy text-pretty text-grey md:col-end-4">{text}</p>}
    </li>
  )
}
