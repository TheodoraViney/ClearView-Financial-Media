import type { MediaImage } from '@/components/ui/Media'
import type { PaginationPage } from '@/components/ui/Pagination'

import type { HeadingView } from './awards-programme'
import { pageWindow } from './categories'
import { COMPANY_ENGAGEMENT_PATH } from './links'

/*
 * The Company Engagement page (/companies on ClearView Publishing): one `page` document
 * (COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID) built from blocks, served at /companies only. Its search and filters, company
 * directory, awards, events and sponsored content blocks share the URL state and the records the route loads once.
 * Pure: the URL state, the filtering and the blocks' plain props live here;
 * src/sanity/company-engagement-view.ts maps the query result onto them. No Sanity or Next imports beyond types.
 *
 * URL state: `q` (the company name search), `activity` and `year` (repeated, multi-select; unknown values dropped) act
 * on every list: the Activity filter hides the lists of other types, the search and the Year filter narrow each list to
 * its matching cards. Each paged list has its own page parameter (PAGE_PARAMS: 2 and up, no leading zeros; absent:
 * 1); a page past the end is a 404. A filter change submits the GET form, which drops every list's page.
 */

/** The Company Engagement page document: fixed id and slug. The slug is never served at /{slug}, only at /companies. */
export const COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID = 'page-company-engagement'
export const COMPANY_ENGAGEMENT_PAGE_SLUG = 'company-engagement'

/** Whether a document id (published or draft) is the Company Engagement page's. */
export const isCompanyEngagementPageId = (id: unknown): boolean =>
  String(id ?? '').replace(/^drafts\./, '') === COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID

/** Cards per page of every list. */
export const COMPANY_ENGAGEMENT_PAGE_SIZE = 12

/** The activity types of a company, in the Activity filter's order, as they appear in the URL. */
export const ACTIVITY_TYPES = ['awards', 'forums-and-summits', 'research', 'contributed-content'] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

/** The paged lists and the URL parameter of each one's page. */
export const PAGE_PARAMS = {
  directory: 'page',
  awards: 'awardsPage',
  events: 'eventsPage',
  sponsored: 'sponsoredPage',
  contributed: 'contributedPage',
} as const

export type PagedList = keyof typeof PAGE_PARAMS

/** Every list on its first page. */
export const FIRST_PAGES: Record<PagedList, number> = { directory: 1, awards: 1, events: 1, sponsored: 1, contributed: 1 }

/**
 * The activity type of each record list. Research has no list of its own, only directory activity; sponsored content
 * is no activity type, so any chosen activity hides it.
 */
export const LIST_ACTIVITY: Record<Exclude<PagedList, 'directory'>, ActivityType | null> = {
  awards: 'awards',
  events: 'forums-and-summits',
  sponsored: null,
  contributed: 'contributed-content',
}

/** Each list's anchor: its pagination links land on it, not at the top of the page. */
export const LIST_ANCHORS: Record<PagedList, string> = {
  directory: 'company-directory',
  awards: 'winners-and-awards-sponsors',
  events: 'forum-and-summit-partners',
  sponsored: 'sponsored-content',
  contributed: 'contributed-content',
}

export type EngagementFilters = {
  /** The search as typed, trimmed; empty without one. */
  q: string
  activities: ActivityType[]
  /** Four-digit years, newest first. */
  years: string[]
}

/** `path` is the page the links and the filter form go to. */
export type CompanyEngagementState = EngagementFilters & { pages: Record<PagedList, number>; path: string }

export type RawSearchParams = Record<string, string | string[] | undefined>

/** One counted activity of a company: its type and the year of the record. */
export type CompanyActivity = { type: ActivityType; year: string | null }

/** A directory company as the filters see it; `item` is the caller's card. */
export type DirectoryEntry<T> = {
  /** The name without stega: the search target and the sort key. */
  name: string
  activities: CompanyActivity[]
  item: T
}

// Longest search kept from the URL; company names are far shorter.
const QUERY_MAX = 100

const YEAR_PATTERN = /^\d{4}$/

// No leading zeros or signs, so one page has one URL. `page=1` is page 1 under a second URL, so it is dropped too.
const PAGE_PATTERN = /^[1-9]\d{0,5}$/

/** The year of an ISO date, or null. */
export const yearOf = (date: string | null | undefined): string | null => {
  const year = date?.slice(0, 4)

  return year && YEAR_PATTERN.test(year) ? year : null
}

const all = (value: string | string[] | undefined): string[] => (Array.isArray(value) ? value : value ? [value] : [])

const first = (value: string | string[] | undefined): string | undefined => all(value)[0]

const isActivityType = (value: string): value is ActivityType => (ACTIVITY_TYPES as readonly string[]).includes(value)

/** Lower case without accents or repeated spaces, so "Societe" finds "Société". */
export const searchKey = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** The URL state: each value only when valid (years only those in `years`), each page 1 when absent or malformed. */
export function parseCompanyEngagementState(
  params: RawSearchParams,
  years: string[],
  path: string = COMPANY_ENGAGEMENT_PATH,
): CompanyEngagementState {
  const activities = new Set(all(params.activity).filter(isActivityType))
  const chosenYears = new Set(all(params.year).filter((year) => YEAR_PATTERN.test(year) && years.includes(year)))
  const page = (list: PagedList) => {
    const value = first(params[PAGE_PARAMS[list]])

    return value && PAGE_PATTERN.test(value) ? Number(value) : 1
  }

  return {
    q: (first(params.q) ?? '').trim().slice(0, QUERY_MAX),
    activities: ACTIVITY_TYPES.filter((type) => activities.has(type)),
    years: years.filter((year) => chosenYears.has(year)),
    pages: {
      directory: page('directory'),
      awards: page('awards'),
      events: page('events'),
      sponsored: page('sponsored'),
      contributed: page('contributed'),
    },
    path,
  }
}

export const hasFilters = (filters: EngagementFilters): boolean =>
  Boolean(filters.q || filters.activities.length > 0 || filters.years.length > 0)

/** The page's URL for a state, parameters in a fixed order so one state has one URL. */
export function companyEngagementHref(state: CompanyEngagementState): string {
  const params = new URLSearchParams()

  if (state.q) params.set('q', state.q)
  state.activities.forEach((activity) => params.append('activity', activity))
  state.years.forEach((year) => params.append('year', year))
  ;(Object.keys(PAGE_PARAMS) as PagedList[]).forEach((list) => {
    if (state.pages[list] > 1) params.set(PAGE_PARAMS[list], String(state.pages[list]))
  })

  const query = params.toString()

  return query ? `${state.path}?${query}` : state.path
}

/** The state with the search and filters cleared and every list on its first page. */
export const withoutFilters = (state: CompanyEngagementState): CompanyEngagementState => ({
  q: '',
  activities: [],
  years: [],
  pages: FIRST_PAGES,
  path: state.path,
})

/**
 * The canonical of a view. A page of the unfiltered lists is indexable and its own canonical, so search engines reach
 * every card through the pages; a searched or filtered view is noindex and points at the bare path.
 */
export function companyEngagementCanonical(state: CompanyEngagementState): { path: string; indexable: boolean } {
  return hasFilters(state)
    ? { path: COMPANY_ENGAGEMENT_PATH, indexable: false }
    : { path: companyEngagementHref(state), indexable: true }
}

/** The Year filter's options: the years given, without gaps or duplicates, newest first. */
export const yearOptions = (years: (string | null)[]): string[] =>
  [...new Set(years.flatMap((year) => year ?? []))].sort((a, b) => b.localeCompare(a))

/**
 * The companies matching the filters, in the order given: the name contains the search (ignoring case and accents),
 * and one activity record is of a chosen type (any without one) in a chosen year (any without one), so Awards with
 * 2023 means awards activity in 2023, not awards in any year and anything in 2023.
 */
export function filterDirectory<T>(entries: DirectoryEntry<T>[], filters: EngagementFilters): DirectoryEntry<T>[] {
  const query = searchKey(filters.q)
  const types = new Set<ActivityType>(filters.activities)
  const years = new Set(filters.years)
  const anyActivity = types.size === 0 && years.size === 0

  return entries.filter(
    (entry) =>
      (!query || searchKey(entry.name).includes(query)) &&
      (anyActivity ||
        entry.activities.some(
          (activity) =>
            (types.size === 0 || types.has(activity.type)) && (years.size === 0 || (activity.year !== null && years.has(activity.year))),
        )),
  )
}

/** Whether a record list shows under the Activity filter: every list without a chosen activity, else those of one. */
export const listMatchesActivity = (filters: EngagementFilters, type: ActivityType | null): boolean =>
  filters.activities.length === 0 || (type !== null && filters.activities.includes(type))

/**
 * The record cards matching the search and the Year filter, in the order given: the company name contains the search
 * (ignoring case and accents) and the record is of a chosen year (any without one).
 */
export function filterRecords<T>(
  items: T[],
  filters: EngagementFilters,
  entry: (item: T) => { name: string; year: string | null },
): T[] {
  const query = searchKey(filters.q)
  const years = new Set(filters.years)

  return items.filter((item) => {
    const { name, year } = entry(item)

    return (!query || searchKey(name).includes(query)) && (years.size === 0 || (year !== null && years.has(year)))
  })
}

/** Pages a list of `total` cards takes: at least 1. */
export const pageCount = (total: number): number => Math.max(1, Math.ceil(total / COMPANY_ENGAGEMENT_PAGE_SIZE))

/** The cards of one page. */
export const pageOf = <T>(items: T[], page: number): T[] =>
  items.slice((page - 1) * COMPANY_ENGAGEMENT_PAGE_SIZE, page * COMPANY_ENGAGEMENT_PAGE_SIZE)

export type PaginationView = {
  pages: (PaginationPage | null)[]
  previousHref: string | null
  nextHref: string | null
  previousLabel: string
  nextLabel: string
}

/** One list's pagination: links that change its page only, landing on the list's anchor. */
export function paginationOf(
  state: CompanyEngagementState,
  list: PagedList,
  total: number,
  labels: { previousLabel: string; nextLabel: string },
): PaginationView {
  const current = state.pages[list]
  const pages = pageCount(total)
  const href = (page: number) => `${companyEngagementHref({ ...state, pages: { ...state.pages, [list]: page } })}#${LIST_ANCHORS[list]}`

  return {
    pages: pageWindow(current, pages).map((page) => (page ? { page, href: href(page), current: page === current } : null)),
    previousHref: current > 1 ? href(current - 1) : null,
    nextHref: current < pages ? href(current + 1) : null,
    ...labels,
  }
}

/** One card (shared-shell company-card): a company, or a company's part in an awards edition, an event or a post. */
export type CompanyCardView = {
  key: string
  href: string
  /** The company name. */
  title: string
  /** The link's accessible name, stega-clean: the name, the record's title when there is one, and the link text. */
  label: string
  logo: MediaImage | null
  /** The type label before the year, top right. */
  metaLabel: string | null
  year: string | null
  description: string | null
  tags: { key: string; label: string }[]
  cta: string
}

export type CardListView = { cards: CompanyCardView[]; pagination: PaginationView }

export type FilterDropdownView = {
  name: 'activity' | 'year'
  label: string
  allLabel: string
  options: { value: string; label: string; selected: boolean }[]
  /** The footer link that clears this filter. */
  clear: { label: string; href: string }
}

/** A link that clears filters: in each filter, beside the filters and in the directory's empty state. */
export type ClearLinkView = { label: string; href: string }

/** The search and filters block (`companyFilters`): a GET form acting on every list. */
export type CompanyFiltersView = {
  search: { label: string; placeholder: string; value: string }
  dropdowns: FilterDropdownView[]
  selectedLabel: string
  /** Where the form submits. */
  action: string
  /** The URL state the dropdown inputs reflect. */
  syncKey: string
  /** Shown while a search or filter is set: the unfiltered view. */
  clear: ClearLinkView | null
}

/** The company directory block (`companyDirectory`): the summary line and the matching companies. */
export type CompanyDirectoryView = {
  summary: string
  /** Null when no company matches: the empty state shows instead. */
  list: CardListView | null
  empty: { title: string; clear: ClearLinkView } | null
}

/** The winners and awards sponsors block (`companyAwards`). */
export type CompanyAwardsView = { heading: HeadingView; intro: string | null; list: CardListView }

/** The forum and summit partners block (`companyEvents`). */
export type CompanyEventsView = {
  heading: HeadingView
  intro: string | null
  /** Null when no event names a partner: the panel shows instead. */
  list: CardListView | null
  empty: { badges: string[]; text: string } | null
}

/** The sponsored and contributed content block (`companySponsoredContent`). */
export type CompanySponsoredContentView = {
  heading: HeadingView
  intro: string | null
  groups: { key: 'sponsored' | 'contributed'; label: string; list: CardListView }[]
}
