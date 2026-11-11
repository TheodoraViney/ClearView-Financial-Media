import type { HeadingValue } from '@/sanity/heading'

import type { ArticleCardView, ArticleLink } from './article'
import type { AdUnits } from './gam'

/** The Categories page is the page with this slug, one per editorial brand (`page-categories-{brand}`). */
export const CATEGORIES_PAGE_SLUG = 'categories'

/** The list labels on the Categories page. All are required there, so the page renders them as the CMS holds them. */
export const CATEGORIES_LABEL_KEYS = [
  'topicsLabel',
  'allTopicsLabel',
  'regionsLabel',
  'allRegionsLabel',
  'sortLabel',
  'sortLatestLabel',
  'sortOldestLabel',
  'selectedLabel',
  'clearFiltersLabel',
  'emptyStateText',
  'readArticleLabel',
  'previousLabel',
  'nextLabel',
] as const

export type CategoriesLabels = Record<(typeof CATEGORIES_LABEL_KEYS)[number], string>

/*
 * The Categories page (the articles list) and its URL state, shared by the server page and the filter controls.
 * Pure: no Sanity or Next imports, so a client component can build the same hrefs.
 *
 * URL state: `topic` and `region` repeat (slugs, OR within one filter, AND across filters), `category` is one slug
 * (set by links from article breadcrumbs and Related topics, no control of its own), `sort=oldest` (absent: latest
 * first) and `page` (2 and up; absent: 1). Unknown or malformed values are dropped silently.
 */

export const CATEGORIES_PATH = '/categories'

/** Page 1: the featured story plus 10 cards. Every later page: 10 cards. */
export const FIRST_PAGE_SIZE = 11
export const PAGE_SIZE = 10

export type CategoriesSort = 'latest' | 'oldest'

export type CategoriesState = {
  topics: string[]
  regions: string[]
  category: string | null
  sort: CategoriesSort
  page: number
}

export type RawSearchParams = Record<string, string | string[] | undefined>

// Enough for any real selection; a longer list in a crafted URL is cut, not an error.
const MAX_VALUES = 20
const MAX_SLUG_LENGTH = 96
// No leading zeros or signs, so one page has one URL.
const PAGE_PATTERN = /^[1-9]\d{0,5}$/

const values = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

const slugs = (value: string | string[] | undefined): string[] => [
  ...new Set(
    values(value)
      .map((slug) => slug.trim())
      .filter((slug) => slug !== '' && slug.length <= MAX_SLUG_LENGTH),
  ),
].slice(0, MAX_VALUES)

/** The URL state as written, before slugs are checked against the brand's topics, regions and categories. */
export function parseCategoriesState(params: RawSearchParams): CategoriesState {
  const page = values(params.page)[0]

  return {
    topics: slugs(params.topic),
    regions: slugs(params.region),
    category: slugs(params.category)[0] ?? null,
    sort: values(params.sort)[0] === 'oldest' ? 'oldest' : 'latest',
    page: page && PAGE_PATTERN.test(page) ? Number(page) : 1,
  }
}

/** The state with unknown slugs dropped. */
export function resolveCategoriesState(
  state: CategoriesState,
  known: { topics: Set<string>; regions: Set<string>; categories: Set<string> },
): CategoriesState {
  return {
    ...state,
    topics: state.topics.filter((slug) => known.topics.has(slug)),
    regions: state.regions.filter((slug) => known.regions.has(slug)),
    category: state.category && known.categories.has(state.category) ? state.category : null,
  }
}

/** Whether the URL narrows or reorders the list. Such URLs are noindex with the base list as canonical. */
export function hasFilters(state: CategoriesState): boolean {
  return state.topics.length > 0 || state.regions.length > 0 || state.category !== null || state.sort === 'oldest'
}

/** The page's URL for a state, parameters in a fixed order so one state has one URL. */
export function categoriesHref(state: CategoriesState): string {
  const params = new URLSearchParams()

  state.topics.forEach((slug) => params.append('topic', slug))
  state.regions.forEach((slug) => params.append('region', slug))

  if (state.category) {
    params.set('category', state.category)
  }

  if (state.sort === 'oldest') {
    params.set('sort', 'oldest')
  }

  if (state.page > 1) {
    params.set('page', String(state.page))
  }

  const query = params.toString()

  return query ? `${CATEGORIES_PATH}?${query}` : CATEGORIES_PATH
}

/** A filter or sort change: the other parameters stay, the page goes back to 1. */
export function filterHref(state: CategoriesState, change: Partial<Omit<CategoriesState, 'page'>>): string {
  return categoriesHref({ ...state, ...change, page: 1 })
}

/** Adds the slug to a multi-select filter, or removes it when it is already selected. */
export function toggleSlug(selected: string[], slug: string): string[] {
  return selected.includes(slug) ? selected.filter((value) => value !== slug) : [...selected, slug]
}

/** Another page of the same list. */
export function pageHref(state: CategoriesState, page: number): string {
  return categoriesHref({ ...state, page })
}

/** Every filter cleared; the sort stays. */
export function clearFiltersHref(state: CategoriesState): string {
  return filterHref(state, { topics: [], regions: [], category: null })
}

/** The list's link to one category or topic, from article breadcrumbs and Related topics. */
export function categoryHref(slug: string): string {
  return `${CATEGORIES_PATH}?category=${encodeURIComponent(slug)}`
}

export function topicHref(slug: string): string {
  return `${CATEGORIES_PATH}?topic=${encodeURIComponent(slug)}`
}

/** Pages a list of `total` posts takes: at least 1, which shows the empty state when there are none. */
export function pageCount(total: number): number {
  return total <= FIRST_PAGE_SIZE ? 1 : 1 + Math.ceil((total - FIRST_PAGE_SIZE) / PAGE_SIZE)
}

/** The page's slice of the sorted list, end exclusive (GROQ `[start...end]`). */
export function pageRange(page: number): { start: number; end: number } {
  if (page <= 1) {
    return { start: 0, end: FIRST_PAGE_SIZE }
  }

  const start = FIRST_PAGE_SIZE + (page - 2) * PAGE_SIZE

  return { start, end: start + PAGE_SIZE }
}

// The window shows every page up to this many; beyond it, the first, the last and the current page's neighbours.
const WINDOW_ALL = 7

/**
 * The page numbers the pagination shows, null for an ellipsis:
 * 1 2 3 4 5 … 99 near the start, 1 … 48 49 50 … 99 in the middle, 1 … 95 96 97 98 99 near the end.
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= WINDOW_ALL) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, null, total]
  }

  if (current >= total - 3) {
    return [1, null, total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, null, current - 1, current, current + 1, null, total]
}

/** A post in the list: the article card (labelled with its category) plus what the featured story adds. */
export type CategoriesCardView = ArticleCardView & {
  category: ArticleLink | null
  /** The post's standfirst; the featured story shows it. */
  standfirst: string | null
}

/** One option of the topics or regions filter, with the href that toggles it. */
export type FilterOptionView = { slug: string; title: string; selected: boolean; href: string }

/** The Categories page's props, independent of the CMS (filled by src/sanity/categories-view.ts). */
export type CategoriesView = {
  /** The URL state with unknown slugs dropped, for controls that build their own hrefs. */
  state: CategoriesState
  /** The page title and intro, or the category's or the single topic's when one heads the page. */
  title: string
  intro: string | null
  breadcrumb: { label: string; href?: string | null }[]
  labels: CategoriesLabels
  filters: {
    topics: FilterOptionView[]
    regions: FilterOptionView[]
    allTopicsHref: string
    allRegionsHref: string
    latestHref: string
    oldestHref: string
    /** Shown while any filter (not the sort) is set. */
    clearHref: string | null
  }
  /** Page 1 only: the first post of the list. */
  featured: CategoriesCardView | null
  items: CategoriesCardView[]
  pagination: {
    current: number
    total: number
    previousHref: string | null
    nextHref: string | null
    /** null is an ellipsis. */
    pages: ({ page: number; href: string; current: boolean } | null)[]
  }
  related: { heading: HeadingValue | null; items: { key: string; label: string; href: string }[] } | null
  mostRead: { title: string; items: ArticleCardView[] } | null
  /** The brand's units for other pages: Top and Side around the list, Banner 3 inside the grid. */
  ads: Pick<AdUnits, 'top' | 'side' | 'banner3'>
}
