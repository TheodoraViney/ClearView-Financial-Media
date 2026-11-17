import { stegaClean, type StegaBranded } from 'next-sanity'

import { isBrandKey, type EditorialBrandKey } from '@/brands'
import type { BlockOf, PageBlock } from '@/components/blocks/types'
import {
  CATEGORIES_LABEL_KEYS,
  type CategoriesLabels,
  CATEGORIES_PATH,
  categoryHref,
  clearFiltersHref,
  filterHref,
  hasFilters,
  pageCount,
  pageHref,
  pageWindow,
  resolveCategoriesState,
  toggleSlug,
  topicHref,
  type ArticleListingView,
  type CategoriesCardView,
  type CategoriesHeadingView,
  type CategoriesState,
  type RelatedTopicsView,
} from '@/lib/categories'
import type { AdUnitView } from '@/lib/gam'
import { resolveHref } from '@/lib/links'

import { toHeading } from './heading'
import { toImage } from './image'
import type { CATEGORIES_LATEST_QUERY_RESULT, CATEGORIES_PAGE_QUERY_RESULT } from './types'

/*
 * The Categories page (`page-categories-{brand}`) is built from blocks like any page: a Two columns block with the page
 * heading, the articles list and the related topics in its main column, and Most read (which loads its own list) in
 * its sidebar. The route (src/app/sites/[brand]/categories/page.tsx) resolves the URL state and runs the list query;
 * the blocks read that through `ArticleListingContext`.
 */

// Query results as cachedSanity returns them: strings may carry stega in draft mode.
type PageData = StegaBranded<CATEGORIES_PAGE_QUERY_RESULT>
type ListItem = StegaBranded<CATEGORIES_LATEST_QUERY_RESULT>['items'][number]

/** The ids the list query filters by: the URL's slugs resolved against the brand's options, unknown ones dropped. */
export function resolveCategoriesFilters(state: CategoriesState, data: PageData) {
  const bySlug = <T extends { slug: string | null }>(items: T[]) =>
    new Map(items.flatMap((item) => (item.slug ? [[stegaClean(item.slug), item] as const] : [])))
  const topics = bySlug(data.topics)
  const regions = bySlug(data.regions)
  const categories = bySlug(data.categories)
  const resolved = resolveCategoriesState(state, {
    topics: new Set(topics.keys()),
    regions: new Set(regions.keys()),
    categories: new Set(categories.keys()),
  })

  return {
    state: resolved,
    topicIds: resolved.topics.flatMap((slug) => topics.get(slug)?._id ?? []),
    regionIds: resolved.regions.flatMap((slug) => regions.get(slug)?._id ?? []),
    categoryId: (resolved.category && categories.get(resolved.category)?._id) || '',
    category: resolved.category ? (categories.get(resolved.category) ?? null) : null,
    topic: resolved.topics.length === 1 ? (topics.get(resolved.topics[0]) ?? null) : null,
  }
}

type Filters = ReturnType<typeof resolveCategoriesFilters>

/**
 * What the Categories page's blocks read from its route: the brand's filter options, the resolved URL state, the
 * page's slice of the list and the Banner 3 unit. Without it (any other page) the articles list block renders
 * nothing, and the page heading block renders its plain form.
 */
export type ArticleListingContext = {
  brand: EditorialBrandKey
  data: PageData
  filters: Filters
  list: { total: number; items: ListItem[] }
  banner3: AdUnitView | null
}

/** The page's first block of a type, at the top level or in a Two columns main column. */
function findMainBlock<T extends 'pageHero' | 'articleListing'>(
  blocks: PageBlock[] | null | undefined,
  type: T,
): BlockOf<T> | null {
  for (const block of blocks ?? []) {
    if (block._type === type) {
      return block as BlockOf<T>
    }

    if (block._type === 'splitLayout') {
      const found = findMainBlock(block.main, type)

      if (found) {
        return found
      }
    }
  }

  return null
}

/** The page's first Page heading block, at the top level or in a Two columns main column. */
export const findPageHero = (blocks: PageBlock[] | null | undefined) => findMainBlock(blocks, 'pageHero')

/**
 * What heads the list: the category when one is set, else the topic when exactly one is selected, else the page
 * heading block's title. A category or topic without a description takes the block's intro.
 */
export function categoriesHeading(
  base: { title: string | null; intro: string | null },
  filters: Pick<Filters, 'category' | 'topic'>,
) {
  const term = filters.category ?? filters.topic
  const intro = base.intro

  return term?.title
    ? { title: term.title, intro: term.description || intro, term: true }
    : { title: base.title ?? '', intro, term: false }
}

/**
 * The Page heading block on the Categories page: Home / page, or Home / page (linked) / category or topic. While no
 * topic is selected the H1 carries the articles list's "Select a topic" hint (its label is that block's).
 */
export function toCategoriesHeading(block: BlockOf<'pageHero'>, context: ArticleListingContext): CategoriesHeadingView {
  const heading = categoriesHeading({ title: block.title, intro: block.intro }, context.filters)
  const pageLabel = block.breadcrumbLabel ?? ''
  const listing = findMainBlock(context.data.page?.blocks, 'articleListing')

  return {
    title: heading.title,
    intro: heading.intro,
    topicHint:
      listing?.topicHintLabel && context.filters.state.topics.length === 0
        ? { label: listing.topicHintLabel, filterLabel: listing.topicsLabel ?? '' }
        : null,
    breadcrumb: [
      { label: block.breadcrumbHomeLabel ?? '', href: '/' },
      ...(heading.term ? [{ label: pageLabel, href: CATEGORIES_PATH }, { label: heading.title }] : [{ label: pageLabel }]),
    ],
  }
}

function toLabels(block: BlockOf<'articleListing'>): CategoriesLabels {
  return Object.fromEntries(CATEGORIES_LABEL_KEYS.map((key) => [key, block[key] ?? ''])) as CategoriesLabels
}

function toCard(item: ListItem, brand: EditorialBrandKey): CategoriesCardView | null {
  const brands = (item.brands ?? []).map((key) => stegaClean(key)).filter(isBrandKey)
  const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: item.slug, brands } }, brand)
  const categorySlug = stegaClean(item.category?.slug)

  if (!href || !item.title) {
    return null
  }

  return {
    key: item._id,
    href,
    title: item.title,
    label: item.category?.title ?? null,
    publishedAt: stegaClean(item.publishedAt) ?? null,
    image: toImage(item.image),
    category: item.category?.title
      ? { label: item.category.title, href: categorySlug ? categoryHref(categorySlug) : null }
      : null,
    standfirst: item.excerpt,
  }
}

/** The articles list block's props: filters, the featured story (page 1), the cards and the pagination. */
export function toArticleListingView(block: BlockOf<'articleListing'>, context: ArticleListingContext): ArticleListingView {
  const { data, filters, list, brand } = context
  const { state } = filters
  const total = pageCount(list.total)
  const cards = list.items.map((item) => toCard(item, brand)).filter((card): card is CategoriesCardView => card !== null)
  const first = state.page === 1

  const option = (selected: string[], key: 'topics' | 'regions') => (item: { title: string | null; slug: string | null }) => {
    const slug = stegaClean(item.slug) ?? ''

    return {
      slug,
      title: item.title ?? slug,
      selected: selected.includes(slug),
      href: filterHref(state, { [key]: toggleSlug(selected, slug) }),
    }
  }

  return {
    state,
    labels: toLabels(block),
    filters: {
      topics: data.topics.filter((item) => item.slug).map(option(state.topics, 'topics')),
      regions: data.regions.filter((item) => item.slug).map(option(state.regions, 'regions')),
      allTopicsHref: filterHref(state, { topics: [] }),
      allRegionsHref: filterHref(state, { regions: [] }),
      latestHref: filterHref(state, { sort: 'latest' }),
      oldestHref: filterHref(state, { sort: 'oldest' }),
      clearHref: hasFilters({ ...state, sort: 'latest' }) ? clearFiltersHref(state) : null,
    },
    featured: first ? (cards[0] ?? null) : null,
    items: first ? cards.slice(1) : cards,
    pagination: {
      current: state.page,
      total,
      previousHref: state.page > 1 ? pageHref(state, state.page - 1) : null,
      nextHref: state.page < total ? pageHref(state, state.page + 1) : null,
      pages: pageWindow(state.page, total).map((number) =>
        number === null ? null : { page: number, href: pageHref(state, number), current: number === state.page },
      ),
    },
    banner3: context.banner3,
  }
}

/** The related topics block: its categories and topics as links to the list. Null when none resolves. */
export function toRelatedTopicsView(block: BlockOf<'relatedTopics'>): RelatedTopicsView | null {
  const items = (block.items ?? []).flatMap((item) => {
    const slug = stegaClean(item.slug)

    return slug && item.title
      ? [{ key: item._id, label: item.title, href: item._type === 'category' ? categoryHref(slug) : topicHref(slug) }]
      : []
  })

  return items.length > 0 ? { heading: toHeading(block.heading), items } : null
}
