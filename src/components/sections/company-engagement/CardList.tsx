import { stegaClean } from 'next-sanity'

import { CompanyCard } from '@/components/ui/CompanyCard'
import { Pagination } from '@/components/ui/Pagination'
import type { CardListView } from '@/lib/company-engagement'

import { GRID } from './layout'

// Screen-reader-only text. Visible copy comes from the CMS.
const paginationLabel = (list: string) => `${stegaClean(list)} pages`

/** A page of company cards and the list's pagination (hidden for one page), 40 under the grid. */
export function CardList({ list, label }: { list: CardListView; label: string }) {
  return (
    <div className="flex flex-col">
      <ul className={GRID}>
        {list.cards.map((card) => (
          <li key={card.key} className="flex min-w-0">
            <CompanyCard
              href={card.href}
              title={card.title}
              label={card.label}
              logo={card.logo}
              metaLabel={card.metaLabel}
              year={card.year}
              description={card.description}
              tags={card.tags}
              cta={card.cta}
            />
          </li>
        ))}
      </ul>
      <Pagination
        pages={list.pagination.pages}
        previousHref={list.pagination.previousHref}
        nextHref={list.pagination.nextHref}
        previousLabel={list.pagination.previousLabel}
        nextLabel={list.pagination.nextLabel}
        label={paginationLabel(label)}
        size="touch"
        strongCurrent
        className="mt-10"
      />
    </div>
  )
}
