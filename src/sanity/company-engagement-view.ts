import { stegaClean, type StegaBranded } from 'next-sanity'

import { isBrandKey } from '@/brands'
import type { BlockOf, PageBlock } from '@/components/blocks/types'
import {
  ACTIVITY_TYPES,
  type ActivityType,
  type CardListView,
  type CompanyActivity,
  type CompanyAwardsView,
  type CompanyCardView,
  type CompanyDirectoryView,
  companyEngagementHref,
  type CompanyEngagementState,
  type CompanyEventsView,
  type CompanyFiltersView,
  type CompanySponsoredContentView,
  type DirectoryEntry,
  filterDirectory,
  filterRecords,
  FIRST_PAGES,
  hasFilters,
  LIST_ACTIVITY,
  listMatchesActivity,
  pageCount,
  type PagedList,
  pageOf,
  PAGE_PARAMS,
  paginationOf,
  parseCompanyEngagementState,
  type RawSearchParams,
  withoutFilters,
  yearOf,
  yearOptions,
} from '@/lib/company-engagement'
import {
  COUNT_TOKEN,
  FILTER_VALUES_TOKEN,
  FILTERS_TOKEN,
  SEARCH_TOKEN,
  TERM_TOKEN,
  TOTAL_TOKEN,
} from '@/lib/company-engagement-copy'
import { resolveHref, sharedRecordHref } from '@/lib/links'
import { fillTemplate } from '@/lib/partner-profile-copy'

import { toHeading } from './heading'
import { toImage } from './image'
import type { COMPANY_ENGAGEMENT_QUERY_RESULT } from './types'

/*
 * The Company Engagement page's blocks as plain props. The route fetches the records once (COMPANY_ENGAGEMENT_QUERY)
 * and builds one context from them and the URL (toCompanyEngagementContext): the lists, label-free, filtered by the
 * search and filters, and the URL state. Each block then applies its own labels to its list. The Activity labels are the search and filters block's; the
 * directory's card tags and summary line share them.
 */

export type CompanyEngagementData = StegaBranded<COMPANY_ENGAGEMENT_QUERY_RESULT>
type CompanyData = CompanyEngagementData['companies'][number]
type FiltersBlock = BlockOf<'companyFilters'>

const filled = (value: string | null | undefined): value is string => Boolean(stegaClean(value)?.trim())

/** Plain text with its whitespace collapsed, stega removed. */
const plain = (value: string | null | undefined): string => stegaClean(value ?? '').replace(/\s+/g, ' ').trim()

/** A label as the CMS holds it, stega kept for click-to-edit. Every label is required in the Studio. */
const text = (value: string | null | undefined): string => value ?? ''

const optional = (value: string | null | undefined) => (filled(value) ? value : null)

// Names A to Z ignoring case and accents, numbers by value.
const byName = new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare

// The About text kept for a card, which shows three lines: enough for the widest card, a short page to send.
const DESCRIPTION_MAX = 400

const ACTIVITY_LABELS = {
  awards: 'awardsActivityLabel',
  'forums-and-summits': 'forumsActivityLabel',
  research: 'researchActivityLabel',
  'contributed-content': 'contributedActivityLabel',
} as const satisfies Record<ActivityType, keyof FiltersBlock>

/** A company's part in an awards edition or an event: each is a tag on its card, labelled by the block. */
type Role = 'winner' | 'awardsSponsor' | 'charityPartner' | 'sponsor' | 'techDemo'

/** A company as every card shows it: name, logo (decorative: the link names the card) and profile path. */
type Company = { id: string; name: string; title: string; logo: CompanyCardView['logo']; href: string | null; about: string }

function toCompany(company: CompanyData): Company {
  const logo = toImage(company.logo)
  const about = plain(company.about)

  return {
    id: company._id,
    name: plain(company.title),
    title: company.title ?? '',
    logo: logo && { ...logo, alt: '' },
    href: sharedRecordHref('company', company.slug, 'clearview'),
    about: about.length > DESCRIPTION_MAX ? `${about.slice(0, DESCRIPTION_MAX)}…` : about,
  }
}

/** Company ids without stega or duplicates, in order. */
const ids = (refs: (string | null)[] | null | undefined): string[] => [
  ...new Set((refs ?? []).flatMap((ref) => stegaClean(ref) ?? [])),
]

/** A record's part for one company: its roles in order, plus the categories won (awards). */
type Part = { roles: Set<Role>; categories: string[] }

/**
 * A card of a company's part in a record or a post, before its block's labels, dated and titled by the record:
 * `recordTitle` keeps stega (the card's description), `recordName` is the plain sort key.
 */
type RecordCard = {
  key: string
  href: string
  company: Company
  recordTitle: string
  recordName: string
  date: string | null
  roles: Role[]
  categories: string[]
}

/** A directory card before its block's labels: the company and its activity types, in the Activity filter's order. */
type DirectoryCard = { company: Company & { href: string }; types: ActivityType[] }

/** Newest record first, then the record's title, then the company name A to Z. */
const byRecord = (a: RecordCard, b: RecordCard): number =>
  (a.date === b.date ? 0 : !a.date ? 1 : !b.date ? -1 : a.date < b.date ? 1 : -1) ||
  byName(a.recordName, b.recordName) ||
  byName(a.company.name, b.company.name)

/** Everything the page lists, before the URL state and the labels are applied. */
function collect(data: CompanyEngagementData) {
  const companies = new Map(
    data.companies.flatMap((company) => (filled(company.title) ? [[company._id, toCompany(company)] as const] : [])),
  )
  const activities = new Map<string, CompanyActivity[]>()
  const addActivity = (id: string, type: ActivityType, date: string | null | undefined) => {
    if (companies.has(id)) {
      activities.set(id, [...(activities.get(id) ?? []), { type, year: yearOf(stegaClean(date)) }])
    }
  }

  // One card per company and record, with its roles there (and, for awards, the categories it won).
  const recordCards = (
    record: { _id: string; title: string | null; slug: string | null; startDate: string | null },
    type: 'awardsProgramme' | 'conferenceEvent',
    parts: Map<string, Part>,
  ): RecordCard[] => {
    const { title } = record
    const href = sharedRecordHref(type, record.slug, 'clearview')
    const date = stegaClean(record.startDate)

    if (!href || !filled(title)) {
      return []
    }

    return [...parts].flatMap(([id, part]) => {
      const company = companies.get(id)

      if (!company) {
        return []
      }

      return [
        {
          key: `${record._id}-${id}`,
          href,
          company,
          recordTitle: title,
          recordName: plain(title),
          date,
          roles: [...part.roles],
          categories: part.categories,
        },
      ]
    })
  }

  const partOf = (parts: Map<string, Part>, id: string): Part => {
    const part = parts.get(id) ?? { roles: new Set<Role>(), categories: [] }

    parts.set(id, part)

    return part
  }

  const awards = data.awards.flatMap((edition) => {
    const parts = new Map<string, Part>()

    for (const win of edition.winners ?? []) {
      const id = stegaClean(win.company)

      if (!id) continue

      const part = partOf(parts, id)

      part.roles.add('winner')

      if (filled(win.category) && !part.categories.some((category) => plain(category) === plain(win.category))) {
        part.categories.push(win.category)
      }
    }

    ids(edition.sponsors).forEach((id) => partOf(parts, id).roles.add('awardsSponsor'))
    ids(edition.charityPartners).forEach((id) => partOf(parts, id).roles.add('charityPartner'))
    parts.forEach((_, id) => addActivity(id, 'awards', edition.startDate))

    return recordCards(edition, 'awardsProgramme', parts)
  })

  const events = data.events.flatMap((event) => {
    const parts = new Map<string, Part>()

    ids(event.sponsors).forEach((id) => partOf(parts, id).roles.add('sponsor'))
    ids(event.techDemos).forEach((id) => partOf(parts, id).roles.add('techDemo'))
    parts.forEach((_, id) => addActivity(id, 'forums-and-summits', event.startDate))

    return recordCards(event, 'conferenceEvent', parts)
  })

  data.research.forEach((report) => addActivity(stegaClean(report.company), 'research', report.publishedAt))

  // A post card: the company, the post's title, the post's own URL (absolute on its brand: never a ClearView path).
  const postCards = (role: 'sponsor' | 'contributor'): RecordCard[] =>
    data.posts.flatMap((post) => {
      const company = companies.get(stegaClean(post[role]) ?? '')
      const brands = (post.brands ?? []).map((brand) => stegaClean(brand)).filter(isBrandKey)
      const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, 'clearview')

      if (!company || !href || !filled(post.title)) {
        return []
      }

      return [
        {
          key: post._id,
          href,
          company,
          recordTitle: post.title,
          recordName: plain(post.title),
          date: stegaClean(post.publishedAt),
          roles: [],
          categories: [],
        },
      ]
    })

  data.posts.forEach((post) => addActivity(stegaClean(post.contributor) ?? '', 'contributed-content', post.publishedAt))

  const directory: DirectoryEntry<DirectoryCard>[] = [...companies.values()]
    .flatMap(({ href, ...company }) => {
      if (!href) {
        return []
      }

      const own = activities.get(company.id) ?? []
      const types = ACTIVITY_TYPES.filter((type) => own.some((activity) => activity.type === type))

      return [{ name: company.name, activities: own, item: { company: { ...company, href }, types } }]
    })
    .sort((a, b) => byName(a.name, b.name))

  return {
    directory,
    awards: awards.sort(byRecord),
    events: events.sort(byRecord),
    sponsored: postCards('sponsor').sort(byRecord),
    contributed: postCards('contributor').sort(byRecord),
  }
}

type RecordList = keyof typeof LIST_ACTIVITY

/**
 * What the Company Engagement route hands its blocks: the lists (label-free), the URL state, the directory's matches,
 * each record list's matches (null when the Activity filter hides the list), the Year filter's options, and the
 * Activity labels of the page's search and filters block (null without one: the directory's cards then carry no
 * activity tags). A block without it renders nothing.
 */
export type CompanyEngagementContext = {
  lists: ReturnType<typeof collect>
  state: CompanyEngagementState
  matches: DirectoryEntry<DirectoryCard>[]
  shown: Record<RecordList, RecordCard[] | null>
  years: string[]
  activityLabels: Record<ActivityType, string> | null
}

/** The context of a request, or null for a page past the end of any list (a 404), shown on the page or not. */
export function toCompanyEngagementContext({
  data,
  blocks,
  params,
}: {
  data: CompanyEngagementData
  blocks: PageBlock[] | null | undefined
  params: RawSearchParams
}): CompanyEngagementContext | null {
  const lists = collect(data)
  const recordLists = (Object.keys(LIST_ACTIVITY) as RecordList[]).map((list) => [list, lists[list]] as const)
  // Every year the filter can match: of any directory activity, and of any card (sponsored posts are no activity).
  const years = yearOptions([
    ...lists.directory.flatMap((entry) => entry.activities.map((activity) => activity.year)),
    ...recordLists.flatMap(([, cards]) => cards.map((card) => yearOf(card.date))),
  ])
  const state = parseCompanyEngagementState(params, years)
  const matches = filterDirectory(lists.directory, state)
  const shown = Object.fromEntries(
    recordLists.map(([list, cards]) => [
      list,
      listMatchesActivity(state, LIST_ACTIVITY[list])
        ? filterRecords(cards, state, (card) => ({ name: card.company.name, year: yearOf(card.date) }))
        : null,
    ]),
  ) as Record<RecordList, RecordCard[] | null>
  const totals: Record<PagedList, number> = {
    directory: matches.length,
    awards: shown.awards?.length ?? 0,
    events: shown.events?.length ?? 0,
    sponsored: shown.sponsored?.length ?? 0,
    contributed: shown.contributed?.length ?? 0,
  }

  if (!(Object.keys(PAGE_PARAMS) as PagedList[]).every((list) => state.pages[list] <= pageCount(totals[list]))) {
    return null
  }

  const filters = blocks?.find((block): block is FiltersBlock => block._type === 'companyFilters')
  const activityLabels = filters
    ? (Object.fromEntries(ACTIVITY_TYPES.map((type) => [type, text(filters[ACTIVITY_LABELS[type]])])) as Record<
        ActivityType,
        string
      >)
    : null

  return { lists, state, matches, shown, years, activityLabels }
}

/** One list's page of cards and its pagination, which changes that list's page only. */
function listOf<T>(
  context: CompanyEngagementContext,
  list: PagedList,
  items: T[],
  toCard: (item: T) => CompanyCardView,
  labels: { previousLabel: string | null; nextLabel: string | null },
): CardListView {
  return {
    cards: pageOf(items, context.state.pages[list]).map(toCard),
    pagination: paginationOf(context.state, list, items.length, {
      previousLabel: text(labels.previousLabel),
      nextLabel: text(labels.nextLabel),
    }),
  }
}

type RecordLabels = { meta: string; cta: string; roles?: Partial<Record<Role, string>> }

/** A record or post card with its block's labels: the type label, the link text and a tag per role. */
function recordCard(card: RecordCard, labels: RecordLabels): CompanyCardView {
  const tags = [...card.roles.map((role) => labels.roles?.[role] ?? ''), ...card.categories]
    .filter(filled)
    .map((label, index) => ({ key: `${index}-${plain(label)}`, label }))

  return {
    key: card.key,
    href: card.href,
    title: card.company.title,
    label: [card.company.name, card.recordName, plain(labels.cta)].join(', '),
    logo: card.company.logo,
    metaLabel: labels.meta,
    year: yearOf(card.date),
    description: card.recordTitle,
    tags,
    cta: labels.cta,
  }
}

/** The search and filters block: the form's fields and its clear links. */
export function toCompanyFiltersView(block: FiltersBlock, context: CompanyEngagementContext): CompanyFiltersView {
  const { state, years } = context
  const reset = FIRST_PAGES
  const clearLabel = text(block.clearFiltersLabel)

  return {
    search: { label: text(block.searchLabel), placeholder: text(block.searchPlaceholder), value: state.q },
    dropdowns: [
      {
        name: 'activity',
        label: text(block.activityFilterLabel),
        allLabel: text(block.activityAllLabel),
        options: ACTIVITY_TYPES.map((type) => ({
          value: type,
          label: text(block[ACTIVITY_LABELS[type]]),
          selected: state.activities.includes(type),
        })),
        clear: { label: clearLabel, href: companyEngagementHref({ ...state, activities: [], pages: reset }) },
      },
      {
        name: 'year',
        label: text(block.yearFilterLabel),
        allLabel: text(block.yearAllLabel),
        options: years.map((year) => ({ value: year, label: year, selected: state.years.includes(year) })),
        clear: { label: clearLabel, href: companyEngagementHref({ ...state, years: [], pages: reset }) },
      },
    ],
    selectedLabel: text(block.selectedLabel),
    action: state.path,
    syncKey: companyEngagementHref({ ...state, pages: reset }),
    clear: hasFilters(state) ? { label: clearLabel, href: companyEngagementHref(withoutFilters(state)) } : null,
  }
}

/** The summary line over the directory: the default line, the filtered one, or the no-results text. */
function summaryOf(block: BlockOf<'companyDirectory'>, context: CompanyEngagementContext): string {
  const { state, matches, lists, activityLabels } = context

  if (!hasFilters(state)) {
    return text(block.summaryDefaultText)
  }

  if (matches.length === 0) {
    return text(block.noResultsText)
  }

  // The chosen activities, then the chosen years, as the design's "for Awards, Research · 2023, 2022".
  const values = [
    state.activities
      .map((type) => activityLabels?.[type])
      .filter(filled)
      .join(', '),
    state.years.join(', '),
  ].filter(Boolean)
  const parts: [string, string][] = [
    [COUNT_TOKEN, String(matches.length)],
    [TOTAL_TOKEN, String(lists.directory.length)],
    [
      FILTERS_TOKEN,
      values.length > 0 ? ` ${fillTemplate(text(block.summaryFiltersText), FILTER_VALUES_TOKEN, values.join(' · '))}` : '',
    ],
    [SEARCH_TOKEN, state.q ? ` ${fillTemplate(text(block.summarySearchText), TERM_TOKEN, state.q)}` : ''],
  ]

  return parts.reduce((line, [token, value]) => fillTemplate(line, token, value), text(block.summaryText))
}

/** The company directory block: the summary line and the companies matching the search and filters, A to Z. */
export function toCompanyDirectoryView(
  block: BlockOf<'companyDirectory'>,
  context: CompanyEngagementContext,
): CompanyDirectoryView {
  const { state, matches, activityLabels } = context
  const cta = text(block.ctaLabel)
  const toCard = ({ item: { company, types } }: DirectoryEntry<DirectoryCard>): CompanyCardView => ({
    key: company.id,
    href: company.href,
    title: company.title,
    label: [company.name, plain(cta)].join(', '),
    logo: company.logo,
    metaLabel: null,
    year: null,
    description: company.about || null,
    tags: types.flatMap((type) => {
      const label = activityLabels?.[type]

      return filled(label) ? [{ key: type, label }] : []
    }),
    cta,
  })

  return {
    summary: summaryOf(block, context),
    list: matches.length > 0 ? listOf(context, 'directory', matches, toCard, block) : null,
    empty:
      matches.length === 0
        ? {
            title: text(block.noResultsText),
            clear: { label: text(block.clearFiltersLabel), href: companyEngagementHref(withoutFilters(state)) },
          }
        : null,
  }
}

/** The winners and awards sponsors block, or null while no awards card matches the search and filters. */
export function toCompanyAwardsView(
  block: BlockOf<'companyAwards'>,
  context: CompanyEngagementContext,
): CompanyAwardsView | null {
  const awards = context.shown.awards

  if (!awards || awards.length === 0) {
    return null
  }

  const labels: RecordLabels = {
    meta: text(block.metaLabel),
    cta: text(block.ctaLabel),
    roles: {
      winner: text(block.winnerLabel),
      awardsSponsor: text(block.awardsSponsorLabel),
      charityPartner: text(block.charityPartnerLabel),
    },
  }

  return {
    heading: toHeading(block.heading),
    intro: optional(block.intro),
    list: listOf(context, 'awards', awards, (card) => recordCard(card, labels), block),
  }
}

/**
 * The forum and summit partners block: the cards matching the search and filters, the panel while no event names a
 * partner, or null when the filters leave no card.
 */
export function toCompanyEventsView(
  block: BlockOf<'companyEvents'>,
  context: CompanyEngagementContext,
): CompanyEventsView | null {
  const events = context.shown.events

  if (!events || (events.length === 0 && hasFilters(context.state))) {
    return null
  }

  const labels: RecordLabels = {
    meta: text(block.metaLabel),
    cta: text(block.ctaLabel),
    roles: { sponsor: text(block.sponsorLabel), techDemo: text(block.techDemoLabel) },
  }

  return {
    heading: toHeading(block.heading),
    intro: optional(block.intro),
    list: events.length > 0 ? listOf(context, 'events', events, (card) => recordCard(card, labels), block) : null,
    empty: events.length === 0 ? { badges: (block.emptyBadges ?? []).filter(filled), text: text(block.emptyText) } : null,
  }
}

/**
 * The sponsored content block: the sponsored and contributed posts matching the search and filters, each group hidden
 * while empty; null while both are.
 */
export function toCompanySponsoredContentView(
  block: BlockOf<'companySponsoredContent'>,
  context: CompanyEngagementContext,
): CompanySponsoredContentView | null {
  const { sponsored, contributed } = context.shown
  const groups = (
    [
      {
        key: 'sponsored',
        label: text(block.sponsoredGroupLabel),
        cards: sponsored,
        labels: { meta: text(block.sponsoredMetaLabel), cta: text(block.sponsoredCtaLabel) },
      },
      {
        key: 'contributed',
        label: text(block.contributedGroupLabel),
        cards: contributed,
        labels: { meta: text(block.contributedMetaLabel), cta: text(block.contributedCtaLabel) },
      },
    ] as const
  ).flatMap(({ key, label, cards, labels }) =>
    cards && cards.length > 0 ? [{ key, label, list: listOf(context, key, cards, (card) => recordCard(card, labels), block) }] : [],
  )

  return groups.length > 0 ? { heading: toHeading(block.heading), intro: optional(block.intro), groups } : null
}
