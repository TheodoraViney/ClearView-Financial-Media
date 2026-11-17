import Link from 'next/link'

import { Meta } from './Meta'

/**
 * One record of a shared listing (shared-listing-record): a rule above, 24px padding top and bottom, 12px between the
 * meta line, the title and the description. Meta: the items (date, region) 13px grey, 16px each side of the dividers,
 * then the status tag last. Title h3 18/22, 20/24 from md, accent on hover; the link opens in the same tab. Optional
 * description 16/22.4 grey. Without href the title is plain text.
 */
export function ListingRecord({
  href,
  title,
  meta,
  status,
  statusLabel,
  description,
}: {
  href: string | null
  title: string
  meta: string[]
  status?: string | null
  /** Screen-reader prefix of the status tag, e.g. "Status: ". */
  statusLabel?: string
  description?: string | null
}) {
  return (
    <article className="flex min-w-0 flex-col gap-3 border-t border-border py-6">
      {(meta.length > 0 || status) && (
        <Meta
          items={meta}
          spacing="relaxed"
          tag={status || undefined}
          tagLabel={statusLabel}
          tagPosition="end"
          className="leading-none"
        />
      )}
      <h3 className="text-headline font-medium text-pretty wrap-anywhere md:text-title-lg">
        {href ? (
          <Link href={href} prefetch={false} className="transition-colors duration-180 ease-out hover:text-accent">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {description && <p className="text-base leading-copy text-pretty text-grey">{description}</p>}
    </article>
  )
}
