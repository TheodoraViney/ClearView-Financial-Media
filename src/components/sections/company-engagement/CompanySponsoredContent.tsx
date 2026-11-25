import { type CompanySponsoredContentView, LIST_ANCHORS } from '@/lib/company-engagement'

import { CardList } from './CardList'
import { EngagementSection } from './EngagementSection'

/** Sponsored content: the sponsored and the contributed posts, each group under its label and paged on its own. */
export function CompanySponsoredContent({ view }: { view: CompanySponsoredContentView }) {
  return (
    <EngagementSection id={LIST_ANCHORS.sponsored} heading={view.heading} intro={view.intro}>
      {view.groups.map((group) => (
        <div
          key={group.key}
          id={group.key === 'contributed' ? LIST_ANCHORS.contributed : undefined}
          className="flex scroll-mt-8 flex-col gap-4 not-first:mt-6"
        >
          <h3 className="text-caption leading-none font-medium text-grey">{group.label}</h3>
          <CardList list={group.list} label={group.label} />
        </div>
      ))}
    </EngagementSection>
  )
}
