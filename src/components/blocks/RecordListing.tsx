import { RecordListing as RecordListingSection } from '@/components/sections/listings/RecordListing'
import { toRecordListingView, type RecordListingContext } from '@/sanity/shared-listings-view'

import type { BlockProps } from './types'

/**
 * The awards, events and research list. Its records, tab and URL come from the shared listings route (`listing`); the
 * route answers a page past the end with a 404 before rendering, so a null view renders nothing.
 */
export function RecordListing({ block, listing }: BlockProps<'recordListing'> & { listing: RecordListingContext }) {
  const view = toRecordListingView(block, listing)

  return view ? <RecordListingSection view={view} /> : null
}
