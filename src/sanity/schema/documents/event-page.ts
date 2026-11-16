import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import type { EventPageCopyKey } from '@/lib/event-page-copy'
import { RELATED_EVENTS_COUNT } from '@/lib/event-page'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { headingField } from '../fields'

/*
 * The conference event template's labels: one document with the fixed id EVENT_PAGE_ID from `src/brands.ts`, opened
 * from the ClearView folder in the Studio, because the page lives on ClearView Publishing only. The event's own
 * content (overview, speakers, agenda, sponsors, venue) lives on the conference event document.
 * The design texts are the fields' initial values only: the page renders what is stored.
 */

const label = (name: EventPageCopyKey, title: string, description: string, group: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    group,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

const heading = (name: string, title: string, description: string, initialText: string, group = 'page') =>
  headingField(name, {
    title,
    defaultLevel: 'h2',
    initialText,
    required: true,
    group,
    description: `${description} Choose the heading level in the style menu. The size on the page stays the same.`,
  })

const NAV = 'In-page navigation link. Hidden when the section is empty.'

export const eventPage = defineType({
  name: 'eventPage',
  title: 'Event page',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'navigation', title: 'Navigation' },
    { name: 'sidebar', title: 'Sidebar' },
  ],
  fields: [
    label('breadcrumbHomeLabel', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.', 'page', 'Home'),
    label(
      'breadcrumbEventsLabel',
      'Breadcrumb events label',
      "Second item of the breadcrumb, linking to the list of the event's type (summits, briefings or webinars).",
      'page',
      'Events',
    ),
    label('summitTypeLabel', 'Summit type label', 'Shown above the title of a summit.', 'page', 'Summits & Forums'),
    label('briefingTypeLabel', 'Briefing type label', 'Shown above the title of a briefing.', 'page', 'Briefings'),
    label('webinarTypeLabel', 'Webinar type label', 'Shown above the title of a webinar.', 'page', 'Webinars'),
    label(
      'statusLabel',
      'Status label (screen readers)',
      'Read by screen readers before the status tag, for example "Status: Upcoming". Not shown on screen.',
      'page',
      'Status:',
    ),
    label('upcomingLabel', 'Upcoming status', "Status of an event whose last day is today or later.", 'page', 'Upcoming'),
    label('pastLabel', 'Past status', "Status of an event whose last day has passed.", 'page', 'Past event'),
    heading('overviewHeading', 'Overview heading', 'Heading above the event introduction.', 'Overview'),
    label('eventFormatLabel', 'Event format heading', 'Small heading of the event format list beside the overview.', 'page', 'Event format'),
    heading('speakersHeading', 'Speakers heading', 'Heading above the speakers.', 'Speakers'),
    label('chairLabel', 'Chair tag', "Tag on a speaker card: a person in the event's Chairs field or marked Chair on an agenda item. A chair who is not among the speakers gets a card too.", 'page', 'Chair'),
    heading('whyAttendHeading', 'Why attend heading', 'Heading above the reasons to attend.', 'Why attend'),
    heading('agendaHeading', 'Agenda heading', 'Heading above the agenda.', 'Agenda'),
    label(
      'agendaChairLabel',
      'Agenda chair prefix',
      'Written before the chair of an agenda session, for example "Chair: Stephen Harris".',
      'page',
      'Chair:',
    ),
    heading('sponsorsHeading', 'Sponsors heading', 'Heading above the sponsors and partners.', 'Sponsors & partners'),
    heading('venueHeading', 'Venue heading', 'Heading above the venue and practical information.', 'Venue & practical information'),
    label('venueLabel', 'Venue label', 'Label of the venue name.', 'page', 'Venue'),
    label('addressLabel', 'Address label', "Label of the venue's address.", 'page', 'Address'),
    label('dateLabel', 'Date label', 'Label of the event date.', 'page', 'Date'),
    label('timeLabel', 'Time label', 'Label of the start and end time.', 'page', 'Time'),
    heading('relatedCoverageHeading', 'Related coverage heading', 'Heading above the related coverage links.', 'Related coverage'),

    label('navOverviewLabel', 'Overview link', NAV, 'navigation', 'Overview'),
    label('navSpeakersLabel', 'Speakers link', NAV, 'navigation', 'Speakers'),
    label('navWhyAttendLabel', 'Why attend link', NAV, 'navigation', 'Why attend'),
    label('navAgendaLabel', 'Agenda link', NAV, 'navigation', 'Agenda'),
    label('navSponsorsLabel', 'Sponsors link', NAV, 'navigation', 'Sponsors & partners'),
    label('navVenueLabel', 'Venue link', NAV, 'navigation', 'Venue'),
    label('navRelatedCoverageLabel', 'Related coverage link', NAV, 'navigation', 'Related Coverage'),

    heading('relatedEventsHeading', 'Related events heading', 'Heading of the related events list.', 'Related events', 'sidebar'),
    defineField({
      name: 'relatedEvents',
      title: 'Related events',
      type: 'array',
      group: 'sidebar',
      description: `Optional. Up to ${RELATED_EVENTS_COUNT} events, shown first in this order on every event page. A pick of the page's own event is skipped on that page. Empty places fill automatically with other events: upcoming ones first by date, then the most recent past ones.`,
      components: { input: AutoFillPicksInput },
      of: [
        defineArrayMember({
          type: 'object',
          name: 'relatedEventPick',
          title: 'Event',
          icon: CalendarIcon,
          fields: [
            defineField({
              name: 'event',
              title: 'Event',
              type: 'reference',
              to: [{ type: 'conferenceEvent' }],
              description: 'Its title, link, date and venue are used on the page.',
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              description: "Leave empty to use the event's title.",
            }),
          ],
          preview: {
            select: { title: 'title', eventTitle: 'event.title', startDate: 'event.startDate' },
            prepare({ title, eventTitle, startDate }: { title?: string; eventTitle?: string; startDate?: string }) {
              return {
                title: title?.trim() || eventTitle || 'No event',
                subtitle: [title?.trim() && eventTitle, startDate].filter(Boolean).join(' · ') || undefined,
                media: CalendarIcon,
              }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.max(RELATED_EVENTS_COUNT).custom((items: { event?: { _ref?: string } }[] | undefined) => {
          const refs = (items ?? []).flatMap((item) => (item.event?._ref ? [item.event._ref] : []))

          return new Set(refs).size === refs.length ? true : 'Each event can be picked once'
        }),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Event page', media: CalendarIcon }
    },
  },
})
