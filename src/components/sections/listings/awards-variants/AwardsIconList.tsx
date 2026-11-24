import { ListingRecord } from '@/components/ui/ListingRecord'
import type { ListingRowView } from '@/lib/shared-listings'

import { AwardsLogo } from './AwardsLogo'

/**
 * AWARDS-LIST-VARIANTS (temporary): the Awards `?view=icon` variant. The plain list's rows with the edition logo in a
 * box of the logos' own ratio (aspect-wordmark, about 3.4:1) on the left, 136 / 176 wide.
 */
export function AwardsIconList({ rows, statusLabel }: { rows: ListingRowView[]; statusLabel: string }) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.key}>
          <ListingRecord
            href={row.href}
            title={row.title}
            meta={[row.date, row.region].filter((item): item is string => Boolean(item))}
            status={row.status?.label}
            statusLabel={statusLabel}
            description={row.standfirst}
            media={<AwardsLogo logo={row.logo} sizes="176px" className="aspect-wordmark w-34 md:w-44" />}
          />
        </li>
      ))}
    </ul>
  )
}
