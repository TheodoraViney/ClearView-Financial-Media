import { stegaClean, type StegaBranded } from 'next-sanity'

import type { OtherProgrammeView } from '@/lib/award-category'
import { countryName } from '@/lib/countries'
import { formatDateRange, formatWeekdayDate } from '@/lib/dates'
import {
  isUpcomingEvent,
  relatedEventItems,
  type EventAgendaTrackView,
  type EventPageSectionId,
  type EventPageView,
  type EventPartnerGroupView,
  type EventSpeakerGroupView,
  type RelatedCoverageItemView,
} from '@/lib/event-page'
import { EVENT_PAGE_COPY_KEYS, type EventPageCopy, type EventPageCopyKey } from '@/lib/event-page-copy'
import type { AdUnits } from '@/lib/gam'
import { EVENT_LISTING_PATHS, isEventType, resolveHref, safeHref, sharedRecordHref } from '@/lib/links'

import { clipDescription, plainText } from './awards-programme-view'
import { toHeading } from './heading'
import { toImage } from './image'
import type { AWARDS_PROGRAMME_QUERY_RESULT, EVENT_PAGE_QUERY_RESULT, RELATED_EVENTS_QUERY_RESULT } from './types'

type RecordData = StegaBranded<AWARDS_PROGRAMME_QUERY_RESULT>
type CopyData = StegaBranded<EVENT_PAGE_QUERY_RESULT>
type OthersData = StegaBranded<RELATED_EVENTS_QUERY_RESULT>

/** The conference event branch of the /events/{slug} record (AWARDS_PROGRAMME_QUERY). */
export type ConferenceEventData = Extract<NonNullable<RecordData>, { _type: 'conferenceEvent' }>

type Body = ConferenceEventData['body']
type RelatedEvent = OthersData[number]

const filled = <T extends string>(value: T | null | undefined): value is T => Boolean(stegaClean(value)?.trim())

/** A Portable Text field with at least one member, else null. */
const richText = <T extends Body>(value: T | null | undefined) => (value && value.length > 0 ? value : null)

/** The labels as the CMS holds them, stega kept for click-to-edit. Every label is required in the Studio. */
function toCopy(copy: NonNullable<CopyData>): EventPageCopy {
  return Object.fromEntries(EVENT_PAGE_COPY_KEYS.map((key) => [key, copy[key] ?? ''])) as EventPageCopy
}

const TYPE_LABELS = {
  summit: 'summitTypeLabel',
  briefing: 'briefingTypeLabel',
  webinar: 'webinarTypeLabel',
} as const satisfies Record<keyof typeof EVENT_LISTING_PATHS, EventPageCopyKey>

/** The metadata description: the start of the introduction cut at a word boundary. Null without one. */
export function eventDescription(event: ConferenceEventData): string | null {
  return clipDescription(stegaClean(plainText(event.body)))
}

/** "Name, Job title, Company", the parts a record has. */
const personLine = (person: { title: string | null; jobTitle: string | null; company: string | null }) =>
  [person.title, person.jobTitle, person.company].filter(filled).join(', ')

/** "08:15–08:45", "08:15", or null. */
function timeRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const from = stegaClean(start)?.trim()
  const to = stegaClean(end)?.trim()

  if (!from) {
    return null
  }

  return to ? `${from}–${to}` : from
}

type SpeakerPerson = NonNullable<NonNullable<NonNullable<ConferenceEventData['speakerTypes']>[number]['people']>[number]>

const toSpeaker = (person: SpeakerPerson, chair: boolean) => ({
  key: person._id,
  name: person.title ?? '',
  jobTitle: filled(person.jobTitle) ? person.jobTitle : null,
  company: filled(person.company) ? person.company : null,
  photo: toImage(person.photo),
  chair,
})

function toSpeakerGroups(event: ConferenceEventData): EventSpeakerGroupView[] {
  // A chair is listed in the event's Chairs field or marked Chair on an agenda item. A person unpublished or deleted
  // after picking dereferences to null.
  const agendaChairs = (event.agenda ?? []).flatMap((track) =>
    (track.items ?? []).flatMap((item) =>
      (item.speakers ?? []).flatMap((speaker) => (stegaClean(speaker.chair) && speaker.person?.title ? [speaker.person] : [])),
    ),
  )
  const chairPeople = [...(event.chairs ?? []).filter((person) => person?.title), ...agendaChairs]
  const chairs = new Set(chairPeople.map((person) => person._id))
  const groups = (event.speakerTypes ?? []).map((group) => ({
    key: group._key,
    name: group.name,
    people: (group.people ?? []).flatMap((person) => (person?.title ? [toSpeaker(person, chairs.has(person._id))] : [])),
  }))
  const shown = groups.filter((group) => group.people.length > 0)

  // A chair who is in no speaker group still gets a card, as in the design: added to the last group, or as the only
  // group when the event lists no speakers.
  const listed = new Set(shown.flatMap((group) => group.people.map((person) => person.key)))
  const extra = chairPeople.filter((person, index) => !listed.has(person._id) && chairPeople.findIndex((p) => p._id === person._id) === index)
  if (extra.length) {
    const last = shown.at(-1)
    const cards = extra.map((person) => toSpeaker(person, true))
    if (last) last.people.push(...cards)
    else shown.push({ key: 'chairs', name: null, people: cards })
  }

  // One group needs no name above it: the section heading already says what it is.
  return shown.map((group) => ({ ...group, name: shown.length > 1 && filled(group.name) ? group.name : null }))
}

function toAgendaTracks(event: ConferenceEventData, chairPrefix: string): EventAgendaTrackView[] {
  const tracks = (event.agenda ?? []).map((track) => ({
    key: track._key,
    title: track.title,
    items: (track.items ?? []).flatMap((item) => {
      const title = filled(item.title) ? item.title : null
      const description = richText(item.text)

      if (!title && !description) {
        return []
      }

      return [
        {
          key: item._key,
          time: timeRange(item.time, item.endTime),
          sessionType: filled(item.sessionType) ? item.sessionType : null,
          title,
          description,
          people: (item.speakers ?? []).flatMap((speaker, _, speakers) => {
            // As in the design: one speaker reads in full, several are listed by name only. Unpublished people
            // dereference to null and do not count.
            const several = speakers.filter((s) => s.person?.title).length > 1
            const line = !speaker.person ? '' : several ? (speaker.person.title ?? '') : personLine(speaker.person)

            if (!line) {
              return []
            }

            return [stegaClean(speaker.chair) ? `${chairPrefix} ${line}` : line]
          }),
        },
      ]
    }),
  }))
  const shown = tracks.filter((track) => track.items.length > 0)

  // A track title is a subheading only between several tracks.
  return shown.map((track) => ({ ...track, title: shown.length > 1 && filled(track.title) ? track.title : null }))
}

function toPartnerGroups(event: ConferenceEventData): EventPartnerGroupView[] {
  const groups = (event.sponsorTypes ?? []).map((group) => ({
    key: group._key,
    name: group.name,
    partners: (group.companies ?? []).flatMap((company) => {
      if (!company?.title) {
        return []
      }

      const website = safeHref(company.websiteUrl)

      return [
        {
          key: company._id,
          name: company.title,
          label: stegaClean(company.title),
          logo: toImage(company.logo),
          description: filled(company.about) ? company.about.trim() : null,
          // The website only: a site-relative or mailto value is not a partner's site.
          href: website && /^https?:\/\//i.test(website) ? website : null,
        },
      ]
    }),
  }))
  const shown = groups.filter((group) => group.partners.length > 0)

  return shown.map((group) => ({ ...group, name: shown.length > 1 && filled(group.name) ? group.name : null }))
}

/**
 * Related coverage: the picked articles in order, each once, labelled by its headline and linked to its final URL (on
 * the article's own publication: no post runs on ClearView). An article unpublished or deleted after picking
 * dereferences to null and is skipped.
 */
function toRelatedCoverage(event: ConferenceEventData): RelatedCoverageItemView[] {
  const seen = new Set<string>()

  return (event.relatedCoverage ?? []).flatMap((post) => {
    if (!post || seen.has(post._id) || !filled(post.title)) {
      return []
    }

    const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands: post.brands } }, 'clearview')

    if (!href) {
      return []
    }

    seen.add(post._id)

    return [{ key: post._id, label: post.title, href }]
  })
}

function toRelatedEvent(event: RelatedEvent, title: string): OtherProgrammeView {
  const date = stegaClean(event.hideDateTime) ? null : formatDateRange(stegaClean(event.startDate), stegaClean(event.endDate))

  return {
    key: event._id,
    title,
    href: sharedRecordHref('conferenceEvent', event.slug, 'clearview'),
    status: null,
    highlight: false,
    meta: [date, filled(event.venue) ? event.venue : null].filter((part): part is string => Boolean(part)),
  }
}

/** The conference event page as plain props, from the event, the event page document and the sidebar fill. */
export function toEventPageView({
  event,
  others,
  copy: rawCopy,
  ads,
  today,
}: {
  event: ConferenceEventData
  others: OthersData
  copy: NonNullable<CopyData>
  ads: AdUnits
  today: string
}): EventPageView {
  const copy = toCopy(rawCopy)
  const eventType = stegaClean(event.eventType)
  const type = isEventType(eventType) ? eventType : null
  const hideDateTime = Boolean(stegaClean(event.hideDateTime))
  const startDate = stegaClean(event.startDate)
  const endDate = stegaClean(event.endDate)
  const upcoming = isUpcomingEvent({ startDate, endDate }, today)
  const body = richText(event.body)
  const format = (event.eventFormat ?? []).filter(filled)
  const speakerGroups = toSpeakerGroups(event)
  const tracks = toAgendaTracks(event, copy.agendaChairLabel)
  const agendaText = richText(event.agendaText)
  const partnerGroups = toPartnerGroups(event)
  const whyAttendPoints = (event.whyAttend?.points ?? []).filter(filled)
  const coverage = toRelatedCoverage(event)
  const venue = filled(event.venue?.title) ? event.venue.title : null
  const date = hideDateTime ? null : formatWeekdayDate(startDate, endDate)
  const startTime = hideDateTime ? null : timeRange(event.startTime, event.endTime)
  const time = startTime ? [startTime, stegaClean(event.timezoneCode)?.trim()].filter(Boolean).join(' ') : null
  const venueItems = [
    { key: 'venue', label: copy.venueLabel, value: venue },
    { key: 'address', label: copy.addressLabel, value: filled(event.venue?.address) ? event.venue.address : null },
    { key: 'date', label: copy.dateLabel, value: date },
    { key: 'time', label: copy.timeLabel, value: time },
  ].flatMap((item) => (item.value ? [{ ...item, value: item.value }] : []))

  const view: Omit<EventPageView, 'nav'> = {
    title: event.title ?? '',
    breadcrumb: [
      { label: copy.breadcrumbHomeLabel, href: '/' },
      { label: copy.breadcrumbEventsLabel, href: type ? EVENT_LISTING_PATHS[type] : null },
      { label: event.title ?? '' },
    ],
    typeLabel: type ? copy[TYPE_LABELS[type]] : null,
    status: { label: upcoming ? copy.upcomingLabel : copy.pastLabel, prefix: `${copy.statusLabel} ` },
    date,
    venue,
    country: countryName(stegaClean(event.country)),
    logo: toImage(event.logo),
    overview:
      body || format.length > 0
        ? {
            heading: toHeading(rawCopy.overviewHeading),
            body,
            format: format.length > 0 ? { label: copy.eventFormatLabel, items: format } : null,
          }
        : null,
    speakers:
      speakerGroups.length > 0
        ? {
            heading: toHeading(rawCopy.speakersHeading),
            groups: speakerGroups,
            chairLabel: copy.chairLabel,
          }
        : null,
    whyAttend:
      whyAttendPoints.length > 0
        ? {
            heading: toHeading(rawCopy.whyAttendHeading),
            intro: richText(event.whyAttend?.intro),
            points: whyAttendPoints,
          }
        : null,
    agenda:
      tracks.length > 0 || agendaText
        ? { heading: toHeading(rawCopy.agendaHeading), tracks, text: tracks.length > 0 ? null : agendaText }
        : null,
    partners: partnerGroups.length > 0 ? { heading: toHeading(rawCopy.sponsorsHeading), groups: partnerGroups } : null,
    venueInfo: venueItems.length > 0 ? { heading: toHeading(rawCopy.venueHeading), items: venueItems } : null,
    relatedCoverage: coverage.length > 0 ? { heading: toHeading(rawCopy.relatedCoverageHeading), links: coverage } : null,
    relatedEvents: {
      heading: toHeading(rawCopy.relatedEventsHeading),
      items: relatedEventItems(rawCopy.relatedEvents, others, { excludeId: event._id, clean: stegaClean }).map(
        ({ event: related, title }) => toRelatedEvent(related, title),
      ),
    },
    ads: { top: ads.top, side: ads.side },
  }

  // One link per section that has content, in page order.
  const sections: [EventPageSectionId, unknown, EventPageCopyKey][] = [
    ['overview', view.overview, 'navOverviewLabel'],
    ['speakers', view.speakers, 'navSpeakersLabel'],
    ['why-attend', view.whyAttend, 'navWhyAttendLabel'],
    ['agenda', view.agenda, 'navAgendaLabel'],
    ['sponsors-and-partners', view.partners, 'navSponsorsLabel'],
    ['venue', view.venueInfo, 'navVenueLabel'],
    ['related-coverage', view.relatedCoverage, 'navRelatedCoverageLabel'],
  ]

  return { ...view, nav: sections.flatMap(([id, section, label]) => (section ? [{ id, label: copy[label] }] : [])) }
}
