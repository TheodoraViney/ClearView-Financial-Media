import { stegaClean, type StegaBranded } from 'next-sanity'

import { isBrandKey, type EditorialBrandKey } from '@/brands'
import { ARTICLE_PAGE_COPY_DEFAULTS } from '@/lib/article-copy'
import {
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
  type CategoriesCardView,
  type CategoriesState,
  type CategoriesView,
} from '@/lib/categories'
import { CATEGORIES_INTRO_DEFAULT, CATEGORIES_LABEL_DEFAULTS, type CategoriesLabels } from '@/lib/categories-copy'
import type { AdUnits } from '@/lib/gam'
import { resolveHref } from '@/lib/links'

import { toMostRead } from './article-view'
import { toHeading } from './heading'
import { toImage } from './image'
import type { MostReadAutoFill } from './most-read'
import type { CATEGORIES_LATEST_QUERY_RESULT, CATEGORIES_PAGE_QUERY_RESULT, MOST_READ_QUERY_RESULT } from './types'

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
 * What heads the list: the category when one is set, else the topic when exactly one is selected, else the page.
 * A category or topic without a description takes the page intro.
 */
export function categoriesHeading(page: NonNullable<PageData['page']>, filters: Pick<Filters, 'category' | 'topic'>) {
  const term = filters.category ?? filters.topic
  const intro = page.intro || CATEGORIES_INTRO_DEFAULT

  return term?.title
    ? { title: term.title, intro: term.description || intro, term: true }
    : { title: page.title ?? '', intro, term: false }
}

function toLabels(labels: NonNullable<PageData['page']>['listLabels']): CategoriesLabels {
  const keys = Object.keys(CATEGORIES_LABEL_DEFAULTS) as (keyof CategoriesLabels)[]

  return Object.fromEntries(keys.map((key) => [key, labels?.[key] || CATEGORIES_LABEL_DEFAULTS[key]])) as CategoriesLabels
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

/** The Categories page's props from its queries. `page.page` must be set; the caller 404s without it. */
export function toCategoriesView({
  data,
  filters,
  list,
  mostRead,
  mostReadFill,
  ads,
  brand,
}: {
  data: PageData & { page: NonNullable<PageData['page']> }
  filters: Filters
  list: { total: number; items: ListItem[] }
  mostRead: StegaBranded<MOST_READ_QUERY_RESULT>
  mostReadFill: StegaBranded<MostReadAutoFill>
  ads: AdUnits
  brand: EditorialBrandKey
}): CategoriesView {
  const { page } = data
  const { state } = filters
  const heading = categoriesHeading(page, filters)
  const total = pageCount(list.total)
  const cards = list.items.map((item) => toCard(item, brand)).filter((card): card is CategoriesCardView => card !== null)
  const first = state.page === 1
  const pageTitle = page.title ?? ''

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
    title: heading.title,
    intro: heading.intro,
    breadcrumb: [
      { label: data.homeLabel || ARTICLE_PAGE_COPY_DEFAULTS.breadcrumbHomeLabel, href: '/' },
      ...(heading.term ? [{ label: pageTitle, href: CATEGORIES_PATH }, { label: heading.title }] : [{ label: pageTitle }]),
    ],
    labels: toLabels(page.listLabels),
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
    related: toRelated(page.relatedTopics),
    mostRead: toMostRead(null, mostRead, mostReadFill, brand),
    ads: { top: ads.top, side: ads.side, banner3: ads.banner3 },
  }
}

function toRelated(related: NonNullable<PageData['page']>['relatedTopics']): CategoriesView['related'] {
  const items = (related?.items ?? []).flatMap((item) => {
    const slug = stegaClean(item.slug)

    return slug && item.title
      ? [{ key: item._id, label: item.title, href: item._type === 'category' ? categoryHref(slug) : topicHref(slug) }]
      : []
  })

  return items.length > 0 ? { heading: toHeading(related?.heading), items } : null
}
