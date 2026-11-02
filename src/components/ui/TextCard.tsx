import Link from 'next/link'

import { Meta } from './Meta'

/**
 * A text-only story card (WB v2.0 News Analysis `news-in-brief-card`): bordered, at least 168 high, 24 padding; the
 * accent category and the date (both 500 13/13), the headline 18/22 clamped to 3 lines and the summary 14/20 clamped
 * to 2. The whole card is the link; it tints on hover (brand `surface-hover`, 180ms ease-out). Fills its grid cell.
 */
export function TextCard({
  href,
  title,
  category,
  date,
  summary,
}: {
  href: string
  title: string
  category?: string | null
  date?: string | null
  summary?: string | null
}) {
  const meta = [category, date].filter((item): item is string => Boolean(item))

  return (
    <Link
      href={href}
      className="flex h-full min-h-42 flex-col gap-3 rounded-sm border border-border p-6 text-foreground transition-colors duration-180 ease-out hover:bg-surface-hover"
    >
      {meta.length > 0 && <Meta items={meta} accentFirst={Boolean(category)} className="leading-none font-medium" />}
      <span className="line-clamp-3 text-headline font-medium">{title}</span>
      {summary && <span className="line-clamp-2 text-sm text-grey">{summary}</span>}
    </Link>
  )
}
