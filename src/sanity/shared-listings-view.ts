import { stegaClean, type StegaBranded } from 'next-sanity'

import type { BlockOf } from '@/components/blocks/types'
import type { EditionStatusCopy } from '@/lib/awards-programme-copy'
import { EDITION_STATUS_LABELS, editionStatus } from '@/lib/awards-status'
import { pageWindow } from '@/lib/categories'
import { formatDateRange, formatLongDate } from '@/lib/dates'
import { isUpcomingEvent } from '@/lib/event-page'
import { sharedRecordHref } from '@/lib/links'
import {
  RECORD_LISTING_COPY_KEYS,
  RECORD_LISTING_TYPE_TOKEN,
  type RecordListingCopy,
  type RecordListingCopyKey,
} from '@/lib/record-listing-copy'
import { REGION_LABELS, regionOf, type Region } from '@/lib/regions'
import {
  filterListing,
  hasListingFilters,
  isOpenEdition,
  LISTING_PAGE_SIZE,
  listingHref,
  listingOptions,
  listingPageCount,
  parseListingFilters,
  parseListingPage,
  rankListing,
  SHARED_LISTINGS_TAB_PATHS,
  SHARED_LISTINGS_TABS,
  STATUS_PARAMS,
  type ListingFilters,
  type ListingFilterView,
  type ListingRecord,
  type ListingRowView,
  type ListingState,
  type ListingStatus,
  type RawSearchParams,
  type RecordListingView,
  type SharedListingsTab,
  type StatusParam,
} from '@/lib/shared-listings'

import { toStatuses } from './award-category-view'
import type { SHARED_LISTINGS_PAGE_QUERY_RESULT } from './types'

type QueryData = StegaBranded<SHARED_LISTINGS_PAGE_QUERY_RESULT>

/** The query result with what the page needs to render: the page document and the awards status labels. */
export type SharedListingsData = QueryData & {
  page: NonNullable<QueryData['page']>
  statuses: NonNullable<QueryData['statuses']>
}

/** Whether the page can render: the shared listings page document and the awards programme page's status labels. */
export const isCompletePage = (data: QueryData): data is SharedListingsData => Boolean(data.page && data.statuses)

/**
 * What the shared listings route hands its record listing block: the tab and path the route opens, the URL, the UK
 * date the statuses are derived with, and the open tab's records. A record listing block without it renders nothing.
 */
export type RecordListingContext = {
  tab: SharedListingsTab
  /** The route's own path: the filter form's action, Clear filters and the pagination links. */
  path: string
  params: RawSearchParams
  today: string
  data: SharedListingsData
}

type RecordListingBlock = BlockOf<'recordListing'>

const filled = <T extends string>(value: T | null | undefined): value is T => Boolean(stegaClean(value)?.trim())

/** The labels as the CMS holds them, stega kept for click-to-edit. Every label is required in the Studio. */
function toCopy(block: RecordListingBlock): RecordListingCopy {
  return Object.fromEntries(RECORD_LISTING_COPY_KEYS.map((key) => [key, block[key] ?? ''])) as RecordListingCopy
}

const TAB_LABELS = {
  awards: 'awardsTabLabel',
  events: 'eventsTabLabel',
  research: 'researchTabLabel',
} as const satisfies Record<SharedListingsTab, RecordListingCopyKey>

const EMPTY_NOUNS = {
  awards: 'emptyAwardNoun',
  events: 'emptyEventNoun',
  research: 'emptyResearchNoun',
} as const satisfies Record<SharedListingsTab, RecordListingCopyKey>

/** The row and filter label of every status: awards from the awards programme page, the rest from the block. */
function statusLabels(copy: RecordListingCopy, statuses: EditionStatusCopy): Record<ListingStatus, string> {
  return {
    launchingSoon: statuses[EDITION_STATUS_LABELS.launchingSoon],
    submissionsOpen: statuses[EDITION_STATUS_LABELS.submissionsOpen],
    ceremonyDue: statuses[EDITION_STATUS_LABELS.ceremonyDue],
    winnersAnnounced: statuses[EDITION_STATUS_LABELS.winnersAnnounced],
    upcoming: copy.upcomingEventLabel,
    past: copy.pastEventLabel,
    published: copy.publishedLabel,
  }
}

// The status each URL value selects, for the option labels: STATUS_PARAMS of every tab in one table.
const STATUS_OF_PARAM = Object.assign({}, ...Object.values(STATUS_PARAMS)) as Record<StatusParam, ListingStatus>

/** How a record's row reads its labels: the status labels and the region names of the block. */
type RowLabels = { statuses: Record<ListingStatus, string>; region: (region: Region | null) => string | null }

/** A record's row, built once the labels are known. The ranking, filters and page count need no labels. */
type RowOf = (labels: RowLabels) => ListingRowView

/** The tab's records as the ranking and filters see them, each carrying how to build its row. */
function toRecords(tab: SharedListingsTab, data: SharedListingsData, today: string): ListingRecord<RowOf>[] {
  switch (tab) {
    case 'awards':
      return data.awards.map((edition) => {
        const startDate = stegaClean(edition.startDate)
        const region = regionOf(stegaClean(edition.country))
        const status = editionStatus(
          {
            nominationsOpeningDate: stegaClean(edition.nominationsOpeningDate),
            nominationsClosingDate: stegaClean(edition.nominationsClosingDate),
            startDate,
            hasWinners: Boolean(edition.hasWinners),
          },
          today,
        )

        return {
          id: edition._id,
          title: stegaClean(edition.title) ?? '',
          date: startDate,
          region,
          status,
          open: isOpenEdition(status),
          item: (labels) => ({
            key: edition._id,
            title: edition.title ?? '',
            href: sharedRecordHref('awardsProgramme', edition.slug, 'clearview'),
            standfirst: filled(edition.standfirst) ? edition.standfirst : null,
            date: stegaClean(edition.hideDateTime) ? null : formatDateRange(startDate, stegaClean(edition.endDate)),
            region: labels.region(region),
            status: status ? { label: labels.statuses[status], highlight: status === 'submissionsOpen' } : null,
          }),
        }
      })
    case 'events':
      return data.events.map((event) => {
        const startDate = stegaClean(event.startDate)
        const endDate = stegaClean(event.endDate)
        const region = regionOf(stegaClean(event.country))
        const upcoming = isUpcomingEvent({ startDate, endDate }, today)
        const status = upcoming ? 'upcoming' : 'past'

        return {
          id: event._id,
          title: stegaClean(event.title) ?? '',
          date: startDate,
          region,
          status,
          open: upcoming,
          item: (labels) => ({
            key: event._id,
            title: event.title ?? '',
            href: sharedRecordHref('conferenceEvent', event.slug, 'clearview'),
            standfirst: null,
            date: stegaClean(event.hideDateTime) ? null : formatDateRange(startDate, endDate),
            region: labels.region(region),
            status: { label: labels.statuses[status], highlight: upcoming },
          }),
        }
      })
    case 'research':
      return data.research.map((report) => {
        const publishedAt = stegaClean(report.publishedAt)

        return {
          id: report._id,
          title: stegaClean(report.title) ?? '',
          date: publishedAt,
          region: null,
          status: 'published',
          open: false,
          item: (labels) => ({
            key: report._id,
            title: report.title ?? '',
            href: sharedRecordHref('resource', report.slug, 'clearview'),
            standfirst: null,
            date: formatLongDate(publishedAt),
            region: null,
            status: { label: labels.statuses.published, highlight: false },
          }),
        }
      })
  }
}

/** The three filters of the GET form, those the tab has options for. */
function toFilterFields(
  copy: RecordListingCopy,
  labels: Record<ListingStatus, string>,
  options: ReturnType<typeof listingOptions>,
  filters: ListingFilters,
): ListingFilterView[] {
  const fields: ListingFilterView[] = [
    {
      name: 'region',
      label: copy.regionFilterLabel,
      options: options.regions.map((region) => ({ value: region, label: copy[REGION_LABELS[region]] })),
      selected: filters.region,
    },
    {
      name: 'year',
      label: copy.yearFilterLabel,
      options: options.years.map((year) => ({ value: year, label: year })),
      selected: filters.year,
    },
    {
      name: 'status',
      label: copy.statusFilterLabel,
      options: options.statuses.map((status) => ({ value: status, label: labels[STATUS_OF_PARAM[status]] })),
      selected: filters.status,
    },
  ]

  return fields.filter((field) => field.options.length > 0)
}

/** The ranked records matching the URL's filters, the tab's filter options and the URL state. */
function listingState({ tab, params, today, data }: Omit<RecordListingContext, 'path'>) {
  const ranked = rankListing(toRecords(tab, data, today))
  const options = listingOptions(tab, ranked)
  const filters = parseListingFilters(params, options)
  const records = filterListing(tab, ranked, filters)

  return { records, options, state: { ...filters, page: parseListingPage(params) } satisfies ListingState }
}

/**
 * The URL state the route's metadata needs (a filtered or paged view is noindex), or null for a page past the end,
 * which the record listing block answers with a 404.
 */
export function sharedListingsState(context: Omit<RecordListingContext, 'path'>): ListingState | null {
  const { records, state } = listingState(context)

  return state.page <= listingPageCount(records.length) ? state : null
}

/**
 * The record listing block as plain props, or null for a page past the end (a 404). Ten records a page; the
 * pagination links keep the filters, and a filter change (the GET form) drops the page number.
 */
export function toRecordListingView(block: RecordListingBlock, context: RecordListingContext): RecordListingView | null {
  const { tab, path, data } = context
  const { records, options, state } = listingState(context)
  const pages = listingPageCount(records.length)

  if (state.page > pages) {
    return null
  }

  const copy = toCopy(block)
  const statuses = statusLabels(copy, toStatuses(data.statuses))
  const labels: RowLabels = { statuses, region: (region) => (region ? copy[REGION_LABELS[region]] : null) }
  const start = (state.page - 1) * LISTING_PAGE_SIZE
  const rows = records.slice(start, start + LISTING_PAGE_SIZE).map((record) => record.item(labels))
  const href = (page: number) => listingHref(path, { ...state, page })

  return {
    tabs: SHARED_LISTINGS_TABS.map((key) => ({
      key,
      label: copy[TAB_LABELS[key]],
      href: SHARED_LISTINGS_TAB_PATHS[key],
      current: key === tab,
    })),
    filters: {
      action: path,
      allLabel: copy.allOptionLabel,
      fields: toFilterFields(copy, statuses, options, state),
      clear: hasListingFilters(state) ? { label: copy.clearFiltersLabel, href: path } : null,
    },
    rows,
    total: records.length,
    empty:
      rows.length === 0
        ? {
            heading: copy.emptyHeading,
            text: copy.emptyText.replace(RECORD_LISTING_TYPE_TOKEN, copy[EMPTY_NOUNS[tab]]),
            button: { label: copy.emptyButtonLabel, href: path },
          }
        : null,
    pagination: {
      pages: pageWindow(state.page, pages).map((page) =>
        page ? { page, href: href(page), current: page === state.page } : null,
      ),
      previousHref: state.page > 1 ? href(state.page - 1) : null,
      nextHref: state.page < pages ? href(state.page + 1) : null,
      previousLabel: copy.previousLabel,
      nextLabel: copy.nextLabel,
    },
  }
}
