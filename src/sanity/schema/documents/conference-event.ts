import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { EVENT_COUNTRIES, altField, legacyWpIdField, timeField } from '../fields'

/**
 * A summit, briefing or webinar. 195 records.
 *
 * Split from awardsProgramme because the source gates the fields: an in-form
 * notice marks the Speakers tab as Summit and Briefing only, and the data
 * agrees. Speakers, agenda and technology demos appear only on records tagged
 * summit or webinar; judging panels and winners never do.
 *
 * URLs are preserved: /events/{slug}/ stays as it is on
 * clearviewpublishing.com. The listings at /events-category/{summits,
 * briefings,webinar}/ are live pages with their own canonical and no noindex,
 * so `eventType` has to survive the migration.
 */
export const conferenceEvent = defineType({
  name: 'conferenceEvent',
  title: 'Conference event',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'schedule', title: 'Date and time' },
    { name: 'speakers', title: 'Speakers' },
    { name: 'agenda', title: 'Agenda' },
    { name: 'sponsors', title: 'Sponsors' },
    { name: 'media', title: 'Media' },
    { name: 'registration', title: 'Registration' },
    { name: 'extra', title: 'Extra tabs' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: { source: 'title', maxLength: 96 },
      description: 'Published at /events/{slug}/. Migrated from WordPress, changing it breaks a live URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'eventType',
      title: 'Event type',
      type: 'string',
      group: 'details',
      options: {
        list: [
          { title: 'Summit', value: 'summit' },
          { title: 'Briefing', value: 'briefing' },
          { title: 'Webinar', value: 'webinar' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      description: 'Drives /events-category/{type}/. From the `events-category` taxonomy, minus the awards term.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Introduction',
      type: 'richText',
      group: 'details',
    }),
    defineField({
      name: 'logo',
      title: 'Event logo',
      type: 'image',
      group: 'details',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'reference',
      to: [{ type: 'company' }],
      group: 'details',
      description: 'Venues are held as Company records in the source.',
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      group: 'details',
      options: { list: EVENT_COUNTRIES },
    }),

    defineField({
      name: 'startDate',
      title: 'Start date',
      type: 'date',
      group: 'schedule',
      validation: (Rule) => Rule.required(),
    }),
    timeField('startTime', 'Start time', 'schedule'),
    defineField({
      name: 'endDate',
      title: 'End date',
      type: 'date',
      group: 'schedule',
      validation: (Rule) =>
        Rule.custom((endDate, context) => {
          const startDate = (context.document as { startDate?: string } | undefined)?.startDate

          if (endDate && startDate && endDate < startDate) {
            return 'End date cannot be before the start date'
          }

          return true
        }),
    }),
    timeField('endTime', 'End time', 'schedule'),
    defineField({
      name: 'timezoneCode',
      title: 'Timezone code',
      type: 'string',
      group: 'schedule',
      description: 'Free text in the source, for example "EST".',
    }),
    defineField({
      name: 'hideDateTime',
      title: 'Hide the date and time on the page',
      type: 'boolean',
      group: 'schedule',
      initialValue: false,
    }),

    defineField({
      name: 'speakerTypes',
      title: 'Speakers',
      type: 'array',
      group: 'speakers',
      of: [defineArrayMember({ type: 'personGroup' })],
      description: 'Grouped by speaker type, as in the source.',
    }),
    defineField({
      name: 'chairs',
      title: 'Chairs',
      type: 'array',
      group: 'speakers',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'person' }] })],
      validation: (Rule) => Rule.unique(),
    }),

    defineField({
      name: 'agenda',
      title: 'Agenda',
      type: 'array',
      group: 'agenda',
      of: [defineArrayMember({ type: 'agenda' })],
      description: 'The structured agenda, from the 2025 repeater. Prefer this over the legacy text below.',
    }),
    defineField({
      name: 'agendaText',
      title: 'Agenda (legacy text)',
      type: 'richText',
      group: 'agenda',
      description:
        'The 2022 wysiwyg agenda field, which was never removed from the source. Hidden once a structured agenda exists. Move the content up and clear this.',
      hidden: ({ document }) => {
        const structured = (document as { agenda?: unknown[] } | undefined)?.agenda

        return Array.isArray(structured) && structured.length > 0
      },
      validation: (Rule) =>
        Rule.custom((legacy, context) => {
          const structured = (context.document as { agenda?: unknown[] } | undefined)?.agenda
          const hasLegacy = Array.isArray(legacy) && legacy.length > 0
          const hasStructured = Array.isArray(structured) && structured.length > 0

          if (hasLegacy && hasStructured) {
            return 'Use either the structured agenda or the legacy text, not both'
          }

          return true
        }),
    }),
    defineField({
      name: 'techDemos',
      title: 'Technology demos',
      type: 'array',
      group: 'agenda',
      of: [
        defineArrayMember({
          name: 'techDemo',
          title: 'Technology demo',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Demonstration title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'company',
              title: 'Company',
              type: 'reference',
              to: [{ type: 'company' }],
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'richText',
            }),
          ],
          preview: {
            select: { title: 'title', company: 'company.title' },
            prepare({ title, company }) {
              return { title: title || 'Untitled demo', subtitle: company || undefined }
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'sponsorTypes',
      title: 'Sponsor tiers',
      type: 'array',
      group: 'sponsors',
      of: [defineArrayMember({ type: 'companyGroup' })],
    }),
    defineField({
      name: 'sponsorBenefits',
      title: 'Sponsor benefits',
      type: 'richText',
      group: 'sponsors',
    }),
    defineField({
      name: 'sponsorVideos',
      title: 'Sponsor videos',
      type: 'videoGallery',
      group: 'sponsors',
    }),

    defineField({
      name: 'photographs',
      title: 'Photographs',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [altField],
        }),
      ],
      options: { layout: 'grid' },
    }),

    defineField({
      name: 'registerButtonLink',
      title: 'Register now button link',
      type: 'url',
      group: 'registration',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'register',
      title: 'Registration details',
      type: 'richText',
      group: 'registration',
    }),

    defineField({
      name: 'faqs',
      title: 'Frequently asked questions',
      type: 'richText',
      group: 'extra',
    }),
    defineField({
      name: 'customTabs',
      title: 'Custom tabs',
      type: 'array',
      group: 'extra',
      of: [defineArrayMember({ type: 'customTab' })],
    }),
    legacyWpIdField,
  ],
  preview: {
    select: {
      title: 'title',
      eventType: 'eventType',
      startDate: 'startDate',
      venue: 'venue.title',
      media: 'logo',
    },
    prepare({ title, eventType, startDate, venue, media }) {
      return {
        title: title || 'Untitled event',
        subtitle: [eventType, startDate, venue].filter(Boolean).join(' · ') || 'No date',
        media,
      }
    },
  },
})
