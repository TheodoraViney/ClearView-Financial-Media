import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import type { EventPageCopyKey } from '@/lib/event-page-copy'
import { RELATED_EVENTS_COUNT } from '@/lib/event-page'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

/*
 * "Event page texts": the conference event template's labels, one document with the fixed id EVENT_PAGE_ID from
 * `src/brands.ts`, opened from the Events folder in the Studio. The page lives on ClearView Publishing only. The
 * event's own content (overview, speakers, agenda, sponsors, venue) lives on the conference event document.
 * Tabs and fieldsets follow the page from top to bottom; a section's heading and its menu link sit side by side.
 * Section headings are plain strings rendered as h2.
 * The design texts are the fields' initial values only: the page renders what is stored.
 */

type FieldOptions = { description?: string; fieldset?: string; group?: string }

const label = (name: EventPageCopyKey, title: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({ name, title, type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

const heading = (name: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({ name, title: 'Heading', type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

/** A section of the page: its heading and its link in the menu under the header, side by side. */
const section = (name: string, headingName: string, headingText: string, navName: EventPageCopyKey, navText: string) => [
  heading(headingName, headingText, { fieldset: name }),
  label(navName, 'Menu link', navText, { fieldset: name }),
]

export const eventPage = defineType({
  name: 'eventPage',
  title: 'Event page texts',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'sections', title: 'Sections' },
    { name: 'sidebar', title: 'Sidebar' },
  ],
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } },
    { name: 'types', title: 'Event type', options: { columns: 2 } },
    { name: 'status', title: 'Status', options: { columns: 2 } },
    { name: 'overview', title: 'Overview', options: { columns: 2 } },
    { name: 'speakers', title: 'Speakers', options: { columns: 2 } },
    { name: 'whyAttend', title: 'Why attend', options: { columns: 2 } },
    { name: 'agenda', title: 'Agenda', options: { columns: 2 } },
    { name: 'sponsors', title: 'Sponsors & partners', options: { columns: 2 } },
    { name: 'venue', title: 'Venue & practical information', options: { columns: 2 } },
    { name: 'relatedCoverage', title: 'Related coverage', options: { columns: 2 } },
  ],
  fields: [
    // Header
    label('breadcrumbHomeLabel', 'Home', 'Home', { group: 'header', fieldset: 'breadcrumb' }),
    label('breadcrumbEventsLabel', 'Events', 'Events', {
      group: 'header',
      fieldset: 'breadcrumb',
      description: "Links to the list of the event's type.",
    }),
    label('summitTypeLabel', 'Summit', 'Summits & Forums', { group: 'header', fieldset: 'types' }),
    label('briefingTypeLabel', 'Briefing', 'Briefings', { group: 'header', fieldset: 'types' }),
    label('webinarTypeLabel', 'Webinar', 'Webinars', { group: 'header', fieldset: 'types' }),
    label('statusLabel', 'Screen reader prefix', 'Status:', {
      group: 'header',
      fieldset: 'status',
      description: 'Read before the status, not shown.',
    }),
    label('upcomingLabel', 'Upcoming', 'Upcoming', { group: 'header', fieldset: 'status' }),
    label('pastLabel', 'Past', 'Past event', { group: 'header', fieldset: 'status' }),

    // Sections, in page order. A menu link is hidden while its section is empty.
    ...section('overview', 'overviewHeading', 'Overview', 'navOverviewLabel', 'Overview'),
    label('eventFormatLabel', 'Event format heading', 'Event format', { fieldset: 'overview' }),

    ...section('speakers', 'speakersHeading', 'Speakers', 'navSpeakersLabel', 'Speakers'),
    label('chairLabel', 'Chair tag', 'Chair', {
      fieldset: 'speakers',
      description: 'A chair not among the speakers gets a card too.',
    }),

    ...section('whyAttend', 'whyAttendHeading', 'Why attend', 'navWhyAttendLabel', 'Why attend'),

    ...section('agenda', 'agendaHeading', 'Agenda', 'navAgendaLabel', 'Agenda'),
    label('agendaChairLabel', 'Chair prefix', 'Chair:', {
      fieldset: 'agenda',
      description: 'Before a session chair: "Chair: Stephen Harris".',
    }),

    ...section('sponsors', 'sponsorsHeading', 'Sponsors & partners', 'navSponsorsLabel', 'Sponsors & partners'),

    ...section('venue', 'venueHeading', 'Venue & practical information', 'navVenueLabel', 'Venue'),
    label('venueLabel', 'Venue', 'Venue', { fieldset: 'venue' }),
    label('addressLabel', 'Address', 'Address', { fieldset: 'venue' }),
    label('dateLabel', 'Date', 'Date', { fieldset: 'venue' }),
    label('timeLabel', 'Time', 'Time', { fieldset: 'venue' }),

    ...section('relatedCoverage', 'relatedCoverageHeading', 'Related coverage', 'navRelatedCoverageLabel', 'Related Coverage'),

    // Sidebar
    heading('relatedEventsHeading', 'Related events', { group: 'sidebar' }),
    defineField({
      name: 'relatedEvents',
      title: 'Pinned events',
      type: 'array',
      group: 'sidebar',
      description: `Optional. Up to ${RELATED_EVENTS_COUNT}, shown first; the page's own event is skipped. Empty places fill with upcoming events, then recent past ones.`,
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
      return { title: 'Event page texts', media: CalendarIcon }
    },
  },
})
