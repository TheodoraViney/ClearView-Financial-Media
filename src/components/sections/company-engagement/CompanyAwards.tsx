import { type CompanyAwardsView, LIST_ANCHORS } from '@/lib/company-engagement'

import { CardList } from './CardList'
import { EngagementSection } from './EngagementSection'

/** "Winners and awards sponsors": one card per awards edition and company, newest first, 12 a page. */
export function CompanyAwards({ view }: { view: CompanyAwardsView }) {
  return (
    <EngagementSection id={LIST_ANCHORS.awards} heading={view.heading} intro={view.intro}>
      <CardList list={view.list} label={view.heading?.text ?? ''} />
    </EngagementSection>
  )
}
