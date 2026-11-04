/**
 * Leaf module for the page blocks: counts, sources and reference filters shared by the block schemas, the Studio
 * auto-fill panel (src/sanity/auto-fill.ts) and its input. It imports no schema type file and no component, so it can
 * never sit in an import cycle (a cycle crashed Studio at load: "Cannot access 'postsOfPageBrand' before initialization").
 */
import { CalendarIcon } from '@sanity/icons/Calendar'
import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { StarIcon } from '@sanity/icons/Star'
import type { ReferenceFilterResolver } from 'sanity'

export const TOP_STORIES_SLIDE_COUNT = 3
export const TOP_STORIES_ARTICLE_COUNT = 3

/** Lead stories per page brand: the ClearView home runs a slider of up to three, a publication home shows one. */
export const topStoriesSlideCount = (brand: unknown): number => (brand === 'clearview' ? TOP_STORIES_SLIDE_COUNT : 1)

/** Blocks only ClearView pages carry, by type name. Newsletter signup ("Stay informed") picks between publications. */
const CLEARVIEW_ONLY_BLOCK_TYPES: readonly string[] = ['newsletterSignup']

/** Whether a page of this brand can carry the block. A page with no brand yet is offered no ClearView-only block. */
export const blockAllowedOnBrand = (type: string, brand: unknown): boolean =>
  !CLEARVIEW_ONLY_BLOCK_TYPES.includes(type) || brand === 'clearview'

// ClearView posts never carry the clearview key: the group page draws on every editorial brand.
export const postsOfPageBrand: ReferenceFilterResolver = ({ document }) => {
  const brand = (document as { brand?: string }).brand

  if (!brand || brand === 'clearview') {
    return {}
  }

  return { filter: '$brand in brands', params: { brand } }
}

export const HIGHLIGHTS_SOURCES = [
  { value: 'awards', title: 'Awards', type: 'awardsProgramme', icon: StarIcon },
  { value: 'events', title: 'Summits & events', type: 'conferenceEvent', icon: CalendarIcon },
  { value: 'research', title: 'Research', type: 'resource', icon: DocumentPdfIcon },
] as const

export type HighlightsSource = (typeof HIGHLIGHTS_SOURCES)[number]['value']

/** The most items a block can show, per source: picks plus fill. The fill tiers in src/sanity/fragments.ts fetch as many. */
export const HIGHLIGHTS_ITEM_MAX: Record<HighlightsSource, number> = {
  awards: 5,
  events: 4,
  research: 3,
}

/** How many items a block shows when its count is empty: the ClearView home's counts. */
export const HIGHLIGHTS_DEFAULT_COUNT: Record<HighlightsSource, number> = {
  awards: 5,
  events: 4,
  research: 2,
}

/** The count a block shows: its own count when valid, else the default for its source. */
export const highlightsCount = (source: HighlightsSource, count: unknown): number =>
  typeof count === 'number' && Number.isInteger(count) && count >= 1
    ? Math.min(count, HIGHLIGHTS_ITEM_MAX[source])
    : HIGHLIGHTS_DEFAULT_COUNT[source]

export const highlightsSourceOf = (value: unknown) => HIGHLIGHTS_SOURCES.find((source) => source.value === value)

/** Items per card when its count is empty, and the most it can show (design). */
export const EXPLORE_CARD_ITEM_MAX = 3

export const EXPLORE_CARD_SOURCES = [
  { value: 'posts', title: 'Posts of a category', type: 'post' },
  ...HIGHLIGHTS_SOURCES.map(({ value, title, type }) => ({ value, title, type })),
] as const

/** News Analysis shows the latest three (design). */
export const POST_CARDS_COUNT = 3

/** News in Brief rows: the design draws 6 on WealthBriefing and Family Wealth Report, 3 on WealthBriefingAsia. */
export const POST_BRIEFS_MAX = 6

/** Top Picks shows three cards (design). */
export const TOP_PICKS_POST_COUNT = 3

/** "In this edition" lists four posts (design). */
export const WEEKLY_ROUNDUP_POST_COUNT = 4
