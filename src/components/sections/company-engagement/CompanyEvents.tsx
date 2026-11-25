import { Badge } from '@/components/ui/Badge'
import { cx } from '@/components/ui/cx'
import { type CompanyEventsView, LIST_ANCHORS } from '@/lib/company-engagement'

import { CardList } from './CardList'
import { EngagementSection } from './EngagementSection'
import { GRID } from './layout'

/**
 * "Forum and summit partners": one card per event and company, newest first, 12 a page; while no event names a
 * partner, a panel with the CMS tags and message in the grid's first column.
 */
export function CompanyEvents({ view }: { view: CompanyEventsView }) {
  return (
    <EngagementSection id={LIST_ANCHORS.events} heading={view.heading} intro={view.intro}>
      {view.list ? (
        <CardList list={view.list} label={view.heading?.text ?? ''} />
      ) : (
        view.empty && (
          <div className={cx(GRID, 'justify-start')}>
            <div className="flex w-full flex-col items-start gap-4 rounded-sm p-6 inset-ring inset-ring-border md:p-8">
              {view.empty.badges.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {view.empty.badges.map((badge, index) => (
                    <Badge key={index} as="li" className="whitespace-nowrap">
                      {badge}
                    </Badge>
                  ))}
                </ul>
              )}
              <p className="max-w-182 text-base leading-copy text-pretty text-grey">{view.empty.text}</p>
            </div>
          </div>
        )
      )}
    </EngagementSection>
  )
}
