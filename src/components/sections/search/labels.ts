import type { SearchType } from '@/lib/search-page'
import type { SearchPageCopyKey } from '@/lib/search-page-copy'

/** The copy field of each type's chip, which also follows the results summary when the type is chosen. */
export const SEARCH_TYPE_CHIP_LABELS: Record<SearchType, SearchPageCopyKey> = {
  article: 'articlesLabel',
  award: 'awardsLabel',
  event: 'eventsLabel',
  research: 'researchLabel',
}

/** The copy field of each type's label on a result card. */
export const SEARCH_TYPE_CARD_LABELS: Record<SearchType, SearchPageCopyKey> = {
  article: 'articleType',
  award: 'awardType',
  event: 'eventType',
  research: 'researchType',
}
