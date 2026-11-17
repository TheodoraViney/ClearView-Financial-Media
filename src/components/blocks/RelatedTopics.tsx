import { PAD } from '@/components/sections/categories/layout'
import { RelatedTopics as RelatedTopicsSection } from '@/components/sections/categories/RelatedTopics'
import { toRelatedTopicsView } from '@/sanity/categories-view'

import type { BlockProps } from './types'

/**
 * "Explore related topics" under the list, ruled off. Its space below is the main column's (the `rail` Two columns);
 * nothing renders when none of its categories and topics is published.
 */
export function RelatedTopics({ block }: BlockProps<'relatedTopics'>) {
  const view = toRelatedTopicsView(block)

  return view ? (
    <RelatedTopicsSection
      heading={view.heading}
      items={view.items}
      className={`mt-16 border-t border-border ${PAD} pt-10 md:mt-20`}
    />
  ) : null
}
