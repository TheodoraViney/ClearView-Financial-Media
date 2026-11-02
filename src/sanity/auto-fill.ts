/**
 * What the site fills automatically into a block's empty pick places, for the Studio panel "Shown automatically now"
 * (src/sanity/components/auto-fill-picks-input.tsx).
 *
 * Mirrors the site exactly:
 * - the fill GROQ is the site's own (`*_FILL` / `RECORD_FILL_BRANCHES` from fragments.ts), run with the same `$brand`
 *   (the page brand) and `$today` (UK date) and the block as `^`: `$block{ ... }` makes the block value the parent
 *   scope, as it is when the site projects the page's blocks;
 * - picks are dereferenced in the same (published) perspective and through the site's brand filter, so a pick that is
 *   not published, or no longer on the page brand, frees its place;
 * - counts and the picks-then-fill merge are the site's (schema constants, src/lib/picks.ts).
 */
import { countOr, picksThenFill, present, topStoriesSplit } from '@/lib/picks'

import {
  ANY_EDITORIAL_POST_PICK,
  BRAND_ITEM_PICK,
  BRAND_POST_PICK,
  EXPLORE_POSTS_FILL,
  POST_BRIEFS_FILL,
  POST_LIST_FILL,
  RECORD_FILL_BRANCHES,
  TOP_PICKS_FILL_OLDER,
  TOP_PICKS_FILL_RECENT,
  TOP_STORIES_FILL,
  WEEKLY_ROUNDUP_FILL,
} from './fragments'
// Leaf module only (no schema type file, no component): importing a schema file here closes an import cycle
// schema → input → auto-fill → schema, which crashed Studio at load.
import {
  EXPLORE_CARD_ITEM_MAX,
  EXPLORE_CARD_SOURCES,
  HIGHLIGHTS_SOURCES,
  highlightsCount,
  highlightsSourceOf,
  POST_BRIEFS_MAX,
  POST_CARDS_COUNT,
  TOP_PICKS_POST_COUNT,
  TOP_STORIES_ARTICLE_COUNT,
  topStoriesSlideCount,
  WEEKLY_ROUNDUP_POST_COUNT,
} from './schema/blocks/shared'

/** One item as the panel lists it: posts and shared records (awards, events, research). */
export type AutoFillItem = {
  _id: string
  _type: string
  title: string | null
  publishedAt?: string | null
  startDate?: string | null
  endDate?: string | null
  image?: string | null
  sponsored?: boolean | null
}

type Ref = { _id: string; _type?: string; sponsored?: boolean | null }

export type AutoFillResult = { picks: (Ref | null)[] | null; slides?: (Ref | null)[] | null; articles?: (Ref | null)[] | null; fill: (AutoFillItem | null)[] | null }

type Block = Record<string, unknown> & { _type?: string; count?: unknown; source?: unknown }

export type AutoFillSpec = {
  /** GROQ run with `$block`, `$brand` and `$today`. */
  query: string
  /** The fill items the site shows now, in site order. */
  select: (result: AutoFillResult, block: Block, brand: string) => AutoFillItem[]
  /** The most picks the field allows (Studio validation), so pinning never exceeds it. */
  max: (block: Block, brand: string) => number
}

// The fields the panel lists. Posts carry the image; shared records come in the HIGHLIGHT_ITEM shape of the fill.
const POST_ITEM = /* groq */ `_id, _type, title, publishedAt, "image": image.asset._ref, "sponsored": defined(sponsor)`
const PICK = /* groq */ `_id, _type, "sponsored": defined(sponsor)`

// `pick` is the site's pick filter for the field (brand rule), so a pick the site drops frees its place here too.
const picksQuery = (field: string, fill: string, pick: string = BRAND_POST_PICK) => /* groq */ `$block{
  "picks": ${field}${pick}->{ ${PICK} },
  "fill": ${fill}
}`

/** The fill places of a picks-then-fill block: what follows the picks in the merged list. */
const fillPart = (picks: (Ref | null)[] | null | undefined, fill: (AutoFillItem | null)[] | null | undefined, count: number) => {
  const merged = picksThenFill<Ref | AutoFillItem>(picks, fill, count)
  const picked = new Set(present(picks).map((pick) => pick._id))

  return merged.filter((item): item is AutoFillItem => !picked.has(item._id))
}

const ofType = <T extends { _type?: string }>(items: (T | null)[] | null | undefined, type: string | undefined) =>
  (items ?? []).filter((item): item is T => item !== null && item._type === type)

const recordType = (source: unknown) => highlightsSourceOf(source)?.type

const SPECS: Record<string, AutoFillSpec> = {
  'topStories.slides': {
    query: /* groq */ `$block{
      "slides": slides${ANY_EDITORIAL_POST_PICK}->{ ${PICK} },
      "articles": articles${ANY_EDITORIAL_POST_PICK}->{ ${PICK} },
      "fill": ${TOP_STORIES_FILL}{ ${POST_ITEM} }
    }`,
    select: (result, _block, brand) =>
      topStoriesSplit(result.slides, result.articles, result.fill, topStoriesSlideCount(brand), TOP_STORIES_ARTICLE_COUNT)
        .fillSlides as AutoFillItem[],
    max: (_block, brand) => topStoriesSlideCount(brand),
  },
  'topStories.articles': {
    query: /* groq */ `$block{
      "slides": slides${ANY_EDITORIAL_POST_PICK}->{ ${PICK} },
      "articles": articles${ANY_EDITORIAL_POST_PICK}->{ ${PICK} },
      "fill": ${TOP_STORIES_FILL}{ ${POST_ITEM} }
    }`,
    select: (result, _block, brand) =>
      topStoriesSplit(result.slides, result.articles, result.fill, topStoriesSlideCount(brand), TOP_STORIES_ARTICLE_COUNT)
        .fillArticles as AutoFillItem[],
    max: () => TOP_STORIES_ARTICLE_COUNT,
  },
  'postCards.posts': {
    query: picksQuery('posts', `${POST_LIST_FILL}{ ${POST_ITEM} }`),
    select: (result) => fillPart(result.picks, result.fill, POST_CARDS_COUNT),
    max: () => POST_CARDS_COUNT,
  },
  'postBriefs.posts': {
    query: picksQuery('posts', `${POST_BRIEFS_FILL}{ ${POST_ITEM} }`),
    select: (result, block) => fillPart(result.picks, result.fill, countOr(block.count, POST_BRIEFS_MAX, POST_BRIEFS_MAX)),
    max: (block) => countOr(block.count, POST_BRIEFS_MAX, POST_BRIEFS_MAX),
  },
  'weeklyRoundup.posts': {
    query: picksQuery('posts', `${WEEKLY_ROUNDUP_FILL}{ ${POST_ITEM} }`),
    select: (result) => fillPart(result.picks, result.fill, WEEKLY_ROUNDUP_POST_COUNT),
    max: () => WEEKLY_ROUNDUP_POST_COUNT,
  },
  'topPicks.posts': {
    query: picksQuery(
      'posts',
      `[...${TOP_PICKS_FILL_RECENT}{ ${POST_ITEM} }, ...${TOP_PICKS_FILL_OLDER}{ ${POST_ITEM} }]`,
    ),
    // A pick that got a sponsor after picking is dropped on the site, so it frees a place.
    select: (result) =>
      fillPart(
        (result.picks ?? []).filter((pick) => pick !== null && !pick.sponsored),
        result.fill,
        TOP_PICKS_POST_COUNT,
      ),
    max: () => TOP_PICKS_POST_COUNT,
  },
  'highlights.items': {
    query: picksQuery('items', `select(${RECORD_FILL_BRANCHES})`, '[]'),
    select: (result, block) => {
      const source = highlightsSourceOf(block.source)

      if (!source) {
        return []
      }

      return fillPart(
        ofType(result.picks, source.type),
        ofType(result.fill, source.type),
        highlightsCount(source.value, block.count),
      )
    },
    max: (block) => {
      const source = highlightsSourceOf(block.source)

      return source ? highlightsCount(source.value, block.count) : 0
    },
  },
  'exploreCard.items': {
    query: picksQuery(
      'items',
      `select(source == "posts" => ${EXPLORE_POSTS_FILL}{ ${POST_ITEM} }, ${RECORD_FILL_BRANCHES})`,
      BRAND_ITEM_PICK,
    ),
    select: (result, block) => {
      const type = EXPLORE_CARD_SOURCES.find((source) => source.value === block.source)?.type ?? recordType(block.source)

      if (!type) {
        return []
      }

      return fillPart(
        ofType(result.picks, type),
        ofType(result.fill, type),
        countOr(block.count, EXPLORE_CARD_ITEM_MAX, EXPLORE_CARD_ITEM_MAX),
      )
    },
    max: (block) => countOr(block.count, EXPLORE_CARD_ITEM_MAX, EXPLORE_CARD_ITEM_MAX),
  },
}

/** The spec for a picks field (`blockType.fieldName`), or null when the field has no automatic fill. */
export function autoFillSpec(blockType: unknown, field: string): AutoFillSpec | null {
  return typeof blockType === 'string' ? (SPECS[`${blockType}.${field}`] ?? null) : null
}

/** Shared record types the highlights and Explore fills return; exported for the panel's date line. */
export const RECORD_TYPES: string[] = HIGHLIGHTS_SOURCES.map((source) => source.type)
