import type { EditionStatus } from './awards-status'
import { AWARDS_LISTING_PATH, EVENT_LISTING_PATHS, RESEARCH_LISTING_PATH } from './links'
import { REGIONS, type Region } from './regions'

/*
 * The shared listings page (ClearView only): one `page` document (SHARED_LISTINGS_PAGE_DOCUMENT_ID) built from blocks,
 * served at five legacy paths with three tabs. Its record listing block lists the open tab's records, filtered and
 * paged by the URL. Pure: the ranking, filter options and URL state live here; src/sanity/shared-listings-view.ts maps
 * the query result onto them.
 *
 * URL state: `region` (a Region; Awards and Events tabs), `year` (four digits, a year present in the tab's records),
 * `status` (one of the tab's STATUS_PARAMS) and `page` (2 and up, no leading zeros; absent: 1). Unknown or malformed
 * values are dropped silently, as on the Search and Categories pages; a page past the end is a 404. A filtered or
 * paged view is noindex; every view's canonical is its tab's path (SHARED_LISTINGS_TAB_PATHS).
 */

/** The shared listings page document: fixed id and slug. The slug is never served at /{slug}, only at the five paths. */
export const SHARED_LISTINGS_PAGE_DOCUMENT_ID = 'page-shared-listings'
export const SHARED_LISTINGS_PAGE_SLUG = 'shared-listings'

/** Records per page of the listing. */
export const LISTING_PAGE_SIZE = 10

/** The tabs, in tab order. */
export const SHARED_LISTINGS_TABS = ['awards', 'events', 'research'] as const

export type SharedListingsTab = (typeof SHARED_LISTINGS_TABS)[number]

/**
 * The `/events-category/{category}` segments and the tab each one opens: summits, briefings and webinars all open the
 * Events tab, which lists every conference event whatever its type. Anything else is a 404.
 */
const EVENTS_CATEGORY_TABS = {
  awards: 'awards',
  summits: 'events',
  briefings: 'events',
  webinar: 'events',
} as const satisfies Record<string, SharedListingsTab>

export type EventsCategory = keyof typeof EVENTS_CATEGORY_TABS

export const EVENTS_CATEGORIES = Object.keys(EVENTS_CATEGORY_TABS) as EventsCategory[]

export const isEventsCategory = (value: string): value is EventsCategory => Object.hasOwn(EVENTS_CATEGORY_TABS, value)

export const eventsCategoryTab = (category: EventsCategory): SharedListingsTab => EVENTS_CATEGORY_TABS[category]

/** The `/resource-categories/{category}` segments: research only. */
export const RESOURCE_CATEGORIES = ['research'] as const

/** Each tab's link. The Events tab opens the summits path, the first of the three event type listings. */
export const SHARED_LISTINGS_TAB_PATHS: Record<SharedListingsTab, string> = {
  awards: AWARDS_LISTING_PATH,
  events: EVENT_LISTING_PATHS.summit,
  research: RESEARCH_LISTING_PATH,
}

/** Where a record stands, as its row shows it. Awards take the edition status (src/lib/awards-status.ts). */
export type ListingStatus = EditionStatus | 'upcoming' | 'past' | 'published'

/** The `status` values each tab accepts in the URL, in option order, and the status each one selects. */
export const STATUS_PARAMS = {
  awards: { 'submissions-open': 'submissionsOpen', 'winners-announced': 'winnersAnnounced' },
  events: { upcoming: 'upcoming', past: 'past' },
  research: { published: 'published' },
} as const satisfies Record<SharedListingsTab, Record<string, ListingStatus>>

export type StatusParam = { [T in SharedListingsTab]: keyof (typeof STATUS_PARAMS)[T] }[SharedListingsTab]

/** The tabs with a Region filter. */
const REGION_TABS: readonly SharedListingsTab[] = ['awards', 'events']

/** One record as the ranking and the filters see it; `item` is the caller's row. */
export type ListingRecord<T> = {
  /** The record's document id: the last tie-breaker of the order. */
  id: string
  /** The title without stega: the tie-breaker of records on the same date. */
  title: string
  /** The ISO date it is sorted and filtered by: the start date of an edition or event, a report's publish date. */
  date: string | null
  region: Region | null
  status: ListingStatus | null
  /** Ranked first, by date ascending: an edition not yet past its winners, an upcoming event. */
  open: boolean
  item: T
}

export type ListingFilters = {
  region: Region | null
  year: string | null
  status: StatusParam | null
}

/** The filters plus the page number, 1 when absent or malformed. */
export type ListingState = ListingFilters & { page: number }

export type ListingOptions = {
  /** Regions present in the tab's records, in REGIONS order. Empty on the Research tab. */
  regions: Region[]
  /** Years present in the tab's records, newest first. */
  years: string[]
  statuses: StatusParam[]
}

export type RawSearchParams = Record<string, string | string[] | undefined>

const YEAR_PATTERN = /^\d{4}$/

const yearOf = (date: string | null): string | null => {
  const year = date?.slice(0, 4)

  return year && YEAR_PATTERN.test(year) ? year : null
}

/** Whether an awards edition counts as open: it has a status, and the status is not "winners announced". */
export const isOpenEdition = (status: EditionStatus | null): boolean => status !== null && status !== 'winnersAnnounced'

type Ranked = { id: string; title: string; date: string | null }

// Titles A to Z ignoring case and accents, numbers by value ("Awards 2026" before "Awards 2027").
const byTitle = new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare

/**
 * Dates ascending or descending, undated last either way; on the same date (or both undated) by title, then by id, so
 * the order and the pages are stable between requests. ISO dates compare as strings.
 */
const byDate =
  (direction: 1 | -1) =>
  (a: Ranked, b: Ranked): number => {
    if (a.date !== b.date) {
      if (!a.date) return 1
      if (!b.date) return -1
      return (a.date < b.date ? -1 : 1) * direction
    }

    return byTitle(a.title, b.title) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  }

/**
 * The tab's order: open records first by date ascending (soonest first), then the rest by date descending (latest
 * first). The Research tab has no open records, so it is newest first. Undated records go last in each group. Records
 * on the same date run by title A to Z, then by id.
 */
export function rankListing<T>(records: ListingRecord<T>[]): ListingRecord<T>[] {
  return [
    ...records.filter((record) => record.open).sort(byDate(1)),
    ...records.filter((record) => !record.open).sort(byDate(-1)),
  ]
}

/** The filter options of a tab, from its records. */
export function listingOptions<T>(tab: SharedListingsTab, records: ListingRecord<T>[]): ListingOptions {
  const regions = new Set(records.map((record) => record.region))
  const years = new Set(records.flatMap((record) => yearOf(record.date) ?? []))

  return {
    regions: REGION_TABS.includes(tab) ? REGIONS.filter((region) => regions.has(region)) : [],
    years: [...years].sort((a, b) => b.localeCompare(a)),
    statuses: Object.keys(STATUS_PARAMS[tab]) as StatusParam[],
  }
}

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value)

/** The URL state of a tab: each value only when it is one of the tab's options, else dropped. */
export function parseListingFilters(params: RawSearchParams, options: ListingOptions): ListingFilters {
  const region = first(params.region)
  const year = first(params.year)
  const status = first(params.status)

  return {
    region: (options.regions as string[]).includes(region ?? '') ? (region as Region) : null,
    year: year && YEAR_PATTERN.test(year) && options.years.includes(year) ? year : null,
    status: (options.statuses as string[]).includes(status ?? '') ? (status as StatusParam) : null,
  }
}

export const hasListingFilters = (filters: ListingFilters): boolean =>
  Boolean(filters.region || filters.year || filters.status)

// No leading zeros or signs, so one page has one URL. `page=1` is page 1 under a second URL, so it is dropped too.
const PAGE_PATTERN = /^[1-9]\d{0,5}$/

/** The page number in the URL: 2 and up; anything else (absent, 1, malformed) is page 1. */
export function parseListingPage(params: RawSearchParams): number {
  const page = first(params.page)

  return page && PAGE_PATTERN.test(page) ? Number(page) : 1
}

/** Pages a list of `total` records takes: at least 1, which shows the empty state when there are none. */
export const listingPageCount = (total: number): number => Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE))

/** The parameters the listing reads from the URL. */
const LISTING_PARAMS: readonly string[] = ['region', 'year', 'status', 'page']

/** The five paths the shared listings page is served at. */
const SHARED_LISTINGS_PATHS: readonly string[] = [AWARDS_LISTING_PATH, ...Object.values(EVENT_LISTING_PATHS), RESEARCH_LISTING_PATH]

/**
 * The query string with the listing parameters that came empty left out (`?region=asia&year=&status=`: the filter form
 * submitted without JavaScript sends its "All" radios as `name=`), every other parameter kept as it came. Null when the
 * path is not a shared listings path or no listing parameter came empty. The proxy redirects to the result, so the
 * no-JavaScript submit lands on the same URL the JavaScript one does (`data-omit-empty` in Dropdown). Not a nameless
 * "All" radio: that would stay out of the URL but also out of its radio group.
 */
export function withoutEmptyListingParams(pathname: string, params: URLSearchParams): string | null {
  if (!SHARED_LISTINGS_PATHS.includes(pathname)) {
    return null
  }

  const kept = new URLSearchParams()
  let dropped = false

  params.forEach((value, key) => {
    if (value === '' && LISTING_PARAMS.includes(key)) {
      dropped = true
    } else {
      kept.append(key, value)
    }
  })

  return dropped ? kept.toString() : null
}

/** Whether the view is indexable: page 1 with no filter. Anything else is noindex, canonical to the base path. */
export const isListingBaseView = (state: ListingState): boolean => !hasListingFilters(state) && state.page === 1

/** The listing's URL for a state, parameters in a fixed order so one state has one URL. */
export function listingHref(path: string, state: ListingState): string {
  const params = new URLSearchParams()

  if (state.region) params.set('region', state.region)
  if (state.year) params.set('year', state.year)
  if (state.status) params.set('status', state.status)
  if (state.page > 1) params.set('page', String(state.page))

  const query = params.toString()

  return query ? `${path}?${query}` : path
}

/** The records a tab shows under its filters, in the order given. */
export function filterListing<T>(tab: SharedListingsTab, records: ListingRecord<T>[], filters: ListingFilters): ListingRecord<T>[] {
  const statuses: Record<string, ListingStatus> = STATUS_PARAMS[tab]
  const status = filters.status ? statuses[filters.status] : null

  return records.filter(
    (record) =>
      (!filters.region || record.region === filters.region) &&
      (!filters.year || yearOf(record.date) === filters.year) &&
      (!status || record.status === status),
  )
}

/** One filter of the GET form: a select named after its URL parameter, its first option "All" (an empty value). */
export type ListingFilterView = {
  name: keyof ListingFilters
  label: string
  options: { value: string; label: string }[]
  /** The selected option's value; null selects All. */
  selected: string | null
}

export type ListingRowView = {
  key: string
  title: string
  href: string | null
  /** Awards only: the edition's standfirst. */
  standfirst: string | null
  /** The date range of an edition or event unless it hides its dates, a report's publish date. */
  date: string | null
  /** The region label; null for a country outside the table, a record without one, and every report. */
  region: string | null
  status: { label: string; highlight: boolean } | null
}

/** The record listing block's props: tabs, filters, the page's records (or the empty state) and the pagination. */
export type RecordListingView = {
  tabs: { key: SharedListingsTab; label: string; href: string; current: boolean }[]
  filters: {
    /** The form's action: the page's own path, so a submit keeps the open tab and drops the page number. */
    action: string
    allLabel: string
    fields: ListingFilterView[]
    /** Shown while any filter is set: the unfiltered path. */
    clear: { label: string; href: string } | null
  }
  /** The current page's rows. */
  rows: ListingRowView[]
  /** Records matching the filters, on every page: for the screen reader count. */
  total: number
  /** Shown instead of the list when no record matches. */
  empty: { heading: string; text: string; button: { label: string; href: string } } | null
  pagination: {
    pages: ({ page: number; href: string; current: boolean } | null)[]
    previousHref: string | null
    nextHref: string | null
    previousLabel: string
    nextLabel: string
  }
}
