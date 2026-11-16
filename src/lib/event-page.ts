import type { PortableTextProps } from 'next-sanity'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { Definition } from '@/components/ui/DefinitionList'
import type { MediaImage } from '@/components/ui/Media'

import type { OtherProgrammeView } from './award-category'
import type { HeadingView } from './awards-programme'
import type { AdUnits } from './gam'

/** Events in the "Related events" sidebar list: the editor's picks, then the automatic fill. */
export const RELATED_EVENTS_COUNT = 3

/** The in-page sections the sticky navigation links to, by their anchor ids. */
export const EVENT_PAGE_SECTIONS = [
  'overview',
  'speakers',
  'why-attend',
  'agenda',
  'sponsors-and-partners',
  'venue',
  'related-coverage',
] as const

export type EventPageSectionId = (typeof EVENT_PAGE_SECTIONS)[number]

/**
 * Whether an event is still ahead: its last day (the end date, else the start date) is today or later, as
 * `coalesce(endDate, startDate) >= $today` in GROQ. ISO dates compare as strings. An undated event counts as past.
 */
export function isUpcomingEvent(event: { startDate?: string | null; endDate?: string | null }, today: string): boolean {
  const last = event.endDate || event.startDate

  return Boolean(last && last >= today)
}

/** The event fields the related events selection reads (RELATED_EVENT in fragments.ts). */
export type RelatedEventFields = { _id: string; title: string | null }

export type RelatedEventPickFields<E> = { title: string | null; event: E | null }

/**
 * The "Related events" list, up to RELATED_EVENTS_COUNT events, shared by the site and the Studio panel:
 * - the editor's picks first, in their order. A pick of the page's own event (`excludeId`; null in the Studio, which
 *   has no page), a repeated event, or one whose event is unpublished is skipped. The title override wins over the
 *   event's title;
 * - then `others` (RELATED_EVENTS_FILL, in order: upcoming events by start date, then past ones, latest first),
 *   skipping the page's own event and the picked ones.
 * `clean` strips stega from a string before it is checked (identity outside draft mode).
 */
export function relatedEventItems<E extends RelatedEventFields>(
  picks: RelatedEventPickFields<E>[] | null | undefined,
  others: E[],
  { excludeId, clean = (value) => value }: { excludeId: string | null; clean?: (value: string) => string },
): { event: E; title: string; picked: boolean }[] {
  const filled = (value: string | null | undefined): value is string => Boolean(value && clean(value).trim())
  const seen = new Set<string>(excludeId ? [excludeId] : [])
  const items: { event: E; title: string; picked: boolean }[] = []

  for (const pick of picks ?? []) {
    const event = pick.event
    const title = filled(pick.title) ? pick.title : event?.title

    if (!event || !filled(title) || seen.has(event._id) || items.length >= RELATED_EVENTS_COUNT) {
      continue
    }

    seen.add(event._id)
    items.push({ event, title, picked: true })
  }

  for (const event of others) {
    if (!filled(event.title) || seen.has(event._id) || items.length >= RELATED_EVENTS_COUNT) {
      continue
    }

    seen.add(event._id)
    items.push({ event, title: event.title, picked: false })
  }

  return items
}

type RichTextValue = PortableTextProps['value']

export type EventSpeakerView = {
  key: string
  name: string
  jobTitle: string | null
  /** The person's first company. */
  company: string | null
  photo: MediaImage | null
  /** The person is in the event's Chairs field or marked Chair on an agenda item. */
  chair: boolean
}

export type EventSpeakerGroupView = {
  key: string
  /** Shown only when the event has more than one group. */
  name: string | null
  people: EventSpeakerView[]
}

export type EventAgendaItemView = {
  key: string
  /** "08:15–08:45", "08:15", or null for an item without a time. */
  time: string | null
  sessionType: string | null
  title: string | null
  description: RichTextValue | null
  /** One line per speaker: "Name, Job title, Company" for a single speaker, the name only when there are several; the chair as "Chair: …". */
  people: string[]
}

export type EventAgendaTrackView = {
  key: string
  /** Shown only when the event has more than one track. */
  title: string | null
  items: EventAgendaItemView[]
}

export type EventPartnerView = {
  key: string
  name: string
  /** The name without Visual Editing markers, for alt text and the link's accessible name. */
  label: string
  logo: MediaImage | null
  /** The company's "About" as plain text, clamped on the card. */
  description: string | null
  /** The company website, external; null renders a card that is not a link. */
  href: string | null
}

export type EventPartnerGroupView = {
  key: string
  /** Shown only when the event has more than one tier. */
  name: string | null
  partners: EventPartnerView[]
}

/** A Related coverage row: an article's headline, linked to its final URL. */
export type RelatedCoverageItemView = { key: string; label: string; href: string }

export type EventPageView = {
  title: string
  breadcrumb: BreadcrumbItem[]
  /** The event type label above the title. */
  typeLabel: string | null
  status: { label: string; prefix: string }
  /** The date range; null when the event hides it. */
  date: string | null
  venue: string | null
  country: string | null
  /** The event logo, shown on a dark box beside the title; without it the text spans the row. */
  logo: MediaImage | null
  nav: { id: EventPageSectionId; label: string }[]
  overview: {
    heading: HeadingView
    body: RichTextValue | null
    format: { label: string; items: string[] } | null
  } | null
  speakers: {
    heading: HeadingView
    groups: EventSpeakerGroupView[]
    chairLabel: string
  } | null
  /** Plain points, not links. */
  whyAttend: { heading: HeadingView; intro: RichTextValue | null; points: string[] } | null
  agenda: {
    heading: HeadingView
    tracks: EventAgendaTrackView[]
    /** A legacy agenda kept as text, shown when the event has no agenda items. */
    text: RichTextValue | null
  } | null
  partners: { heading: HeadingView; groups: EventPartnerGroupView[] } | null
  venueInfo: { heading: HeadingView; items: Definition[] } | null
  relatedCoverage: { heading: HeadingView; links: RelatedCoverageItemView[] } | null
  relatedEvents: { heading: HeadingView; items: OtherProgrammeView[] }
  ads: Pick<AdUnits, 'top' | 'side'>
}
