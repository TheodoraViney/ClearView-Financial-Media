import { ClearLink } from '@/components/ui/ClearLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { type CompanyDirectoryView, LIST_ANCHORS } from '@/lib/company-engagement'

import { CardList } from './CardList'
import { PAD } from './layout'

// Screen-reader-only text. Visible copy comes from the CMS.
const DIRECTORY_LABEL = 'Company directory'

/**
 * The Company Engagement page's company directory: the summary line, then the matching companies A to Z (12 a page),
 * or the empty state with Clear filters when none matches.
 */
export function CompanyDirectory({ view }: { view: CompanyDirectoryView }) {
  return (
    <section
      id={LIST_ANCHORS.directory}
      aria-label={DIRECTORY_LABEL}
      className={`${PAD} flex scroll-mt-8 flex-col gap-6 pt-8 md:pt-10`}
    >
      <p aria-live="polite" className="text-base leading-copy text-pretty text-grey">
        {view.summary}
      </p>
      {view.list ? (
        <CardList list={view.list} label={DIRECTORY_LABEL} />
      ) : (
        view.empty && (
          <EmptyState
            variant="rule"
            titleAs="h2"
            title={view.empty.title}
            action={
              <ClearLink href={view.empty.clear.href} className="-my-3.75">
                {view.empty.clear.label}
              </ClearLink>
            }
          />
        )
      )}
    </section>
  )
}
