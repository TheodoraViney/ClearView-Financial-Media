import Link from 'next/link'

import { Meta } from '@/components/ui/Meta'
import type { ListingRowView } from '@/lib/shared-listings'

import { AwardsLogo } from './AwardsLogo'

/**
 * AWARDS-LIST-VARIANTS (temporary): the Awards `?view=grid` variant. Compact bordered cards, one column on mobile, two
 * from md, three from the header breakpoint: the logo in an 80px band, the title (a link, accent on hover), then the
 * date, the region and the status tag (accent while submissions are open), as the plain list's meta line.
 */
export function AwardsGrid({ rows, statusLabel }: { rows: ListingRowView[]; statusLabel: string }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 header:grid-cols-3">
      {rows.map((row) => (
        <li key={row.key} className="flex min-w-0">
          <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-sm bg-white p-4 inset-ring inset-ring-border">
            <AwardsLogo logo={row.logo} sizes="320px" className="h-20 w-full" />
            <h3 className="text-base leading-copy font-medium text-pretty wrap-anywhere">
              {row.href ? (
                <Link href={row.href} prefetch={false} className="transition-colors duration-180 ease-out hover:text-accent">
                  {row.title}
                </Link>
              ) : (
                row.title
              )}
            </h3>
            <Meta
              items={[row.date, row.region].filter((item): item is string => Boolean(item))}
              spacing="relaxed"
              tag={
                row.status && <span className={row.status.highlight ? 'text-accent' : undefined}>{row.status.label}</span>
              }
              tagLabel={statusLabel}
              tagPosition="end"
              className="mt-auto leading-none"
            />
          </article>
        </li>
      ))}
    </ul>
  )
}
