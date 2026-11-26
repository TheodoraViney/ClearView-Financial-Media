/*
 * Visible labels of the record listing block (`recordListing`: the awards, events and research lists of the shared
 * listings page), edited on the block in the Studio. The design texts live only as the fields' initial values in the
 * schema; the page renders the stored values. The awards status labels are not here: they are the awards programme
 * page's (src/lib/awards-status.ts).
 * Pure: no Sanity or Next imports, so the Studio validation and the page share the template rule.
 */

export const RECORD_LISTING_COPY_KEYS = [
  'awardsTabLabel',
  'eventsTabLabel',
  'researchTabLabel',
  'regionFilterLabel',
  'yearFilterLabel',
  'statusFilterLabel',
  'allOptionLabel',
  'clearFiltersLabel',
  'upcomingEventLabel',
  'pastEventLabel',
  'publishedLabel',
  'emptyHeading',
  'emptyText',
  'emptyAwardNoun',
  'emptyEventNoun',
  'emptyResearchNoun',
  'emptyButtonLabel',
  'previousLabel',
  'nextLabel',
] as const

export type RecordListingCopyKey = (typeof RECORD_LISTING_COPY_KEYS)[number]

export type RecordListingCopy = Record<RecordListingCopyKey, string>

/** Replaced in the empty state text by the open tab's noun (emptyAwardNoun, emptyEventNoun or emptyResearchNoun). */
export const RECORD_LISTING_TYPE_TOKEN = '{type}'

const PLACEHOLDER = /\{[^}]*\}/g

/** Why the empty state text is invalid, or null when it is valid (an empty value is the required rule's job). */
export function emptyTextError(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  if (value.split(RECORD_LISTING_TYPE_TOKEN).length !== 2) {
    return `Use ${RECORD_LISTING_TYPE_TOKEN} exactly once`
  }

  const unknown = (value.match(PLACEHOLDER) ?? []).find((token) => token !== RECORD_LISTING_TYPE_TOKEN)

  return unknown ? `Unknown placeholder ${unknown}: only ${RECORD_LISTING_TYPE_TOKEN} is filled in` : null
}
