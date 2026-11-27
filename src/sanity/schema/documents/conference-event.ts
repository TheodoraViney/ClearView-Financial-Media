import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { EVENT_COUNTRIES, altField, isUniqueEventSlug, legacyWpIdField, timeField } from '../fields'
import { paragraphsBlock } from '../objects/rich-text'

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
    { name: 'header', title: 'Header', default: true },
    { name: 'overview', title: 'Overview' },
    { name: 'speakers', title: 'Speakers' },
    { name: 'whyAttend', title: 'Why attend' },
    { name: 'agenda', title: 'Agenda' },
    { name: 'sponsors', title: 'Sponsors' },
    { name: 'relatedCoverage', title: 'Related coverage' },
    // Legacy WordPress fields only, all hidden: tab hidden in the Studio. Remove before launch if unused.
    { name: 'media', title: 'Media', hidden: true },
    // Legacy WordPress fields only, all hidden: tab hidden in the Studio. Remove before launch if unused.
    { name: 'registration', title: 'Registration', hidden: true },
    // Legacy WordPress fields only, all hidden: tab hidden in the Studio. Remove before launch if unused.
    { name: 'extra', title: 'Extra tabs', hidden: true },
  ],
  fieldsets: [
    { name: 'location', title: 'Location', options: { columns: 2 } },
    { name: 'dates', title: 'Dates', options: { columns: 2 } },
    { name: 'time', title: 'Time', description: '24-hour clock, for example 14:00.', options: { columns: 3 } },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'header',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'header',
      options: { source: 'title', maxLength: 96, isUnique: isUniqueEventSlug },
      // Migrated from WordPress.
      description: 'Published at /events/{slug}/; changing it breaks a live URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'eventType',
      title: 'Event type',
      type: 'string',
      group: 'header',
      options: {
        list: [
          { title: 'Summit', value: 'summit' },
          { title: 'Briefing', value: 'briefing' },
          { title: 'Webinar', value: 'webinar' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      // Drives /events-category/{type}/. From the WordPress `events-category` taxonomy, minus the awards term.
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Event logo',
      type: 'image',
      group: 'header',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'startDate',
      title: 'Start date',
      type: 'date',
      group: 'header',
      fieldset: 'dates',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End date',
      type: 'date',
      group: 'header',
      fieldset: 'dates',
      validation: (Rule) =>
        Rule.custom((endDate, context) => {
          const startDate = (context.document as { startDate?: string } | undefined)?.startDate

          if (endDate && startDate && endDate < startDate) {
            return 'End date cannot be before the start date'
          }

          return true
        }),
    }),
    defineField({
      name: 'hideDateTime',
      title: 'Hide date and time',
      type: 'boolean',
      description: 'Hides the date and time everywhere on the site, e.g. until they are confirmed.',
      group: 'header',
      fieldset: 'dates',
      initialValue: false,
    }),
    // The 24-hour format hint sits on the Time fieldset instead of under each field.
    { ...timeField('startTime', 'Start time', 'header'), fieldset: 'time', description: undefined },
    { ...timeField('endTime', 'End time', 'header'), fieldset: 'time', description: undefined },
    defineField({
      name: 'timezoneCode',
      title: 'Timezone',
      type: 'string',
      group: 'header',
      fieldset: 'time',
      // Free text in the WordPress source, for example "EST". Shown after the time.
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'reference',
      to: [{ type: 'company' }],
      group: 'header',
      fieldset: 'location',
      description: 'Venues are Company records.',
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      group: 'header',
      fieldset: 'location',
      options: { list: EVENT_COUNTRIES },
    }),
    defineField({
      name: 'body',
      title: 'Introduction',
      type: 'richText',
      group: 'overview',
    }),
    defineField({
      name: 'eventFormat',
      title: 'Event format',
      type: 'array',
      group: 'overview',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
      description: 'Short points listed beside the introduction.',
    }),
    defineField({
      name: 'speakerTypes',
      title: 'Speakers',
      type: 'array',
      group: 'speakers',
      of: [defineArrayMember({ type: 'personGroup' })],
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
      name: 'whyAttend',
      title: 'Why attend',
      type: 'object',
      group: 'whyAttend',
      options: { collapsible: false },
      validation: (Rule) =>
        Rule.custom((value: { intro?: unknown[]; points?: unknown[] } | undefined) =>
          value?.intro?.length && !value.points?.length ? 'The section is hidden until it has at least one point.' : true,
        ).warning(),
      fields: [
        defineField({
          name: 'intro',
          title: 'Introduction',
          type: 'array',
          of: [paragraphsBlock],
        }),
        defineField({
          name: 'points',
          title: 'Points',
          type: 'array',
          of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
        }),
      ],
    }),
    defineField({
      name: 'agenda',
      title: 'Agenda',
      type: 'array',
      group: 'agenda',
      of: [defineArrayMember({ type: 'agenda' })],
    }),
    defineField({
      name: 'agendaText',
      title: 'Agenda (legacy text)',
      type: 'richText',
      group: 'agenda',
      // An old agenda kept as text because its lines could not be read as items.
      description: 'Shown on the page while the agenda above is empty; move it there and clear this.',
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
      name: 'sponsorTypes',
      title: 'Sponsor tiers',
      type: 'array',
      group: 'sponsors',
      of: [defineArrayMember({ type: 'companyGroup' })],
    }),
    defineField({
      name: 'techDemos',
      title: 'Technology demos',
      type: 'array',
      group: 'sponsors',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
      name: 'sponsorBenefits',
      title: 'Sponsor benefits',
      type: 'richText',
      group: 'sponsors',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'sponsorVideos',
      title: 'Sponsor videos',
      type: 'videoGallery',
      group: 'sponsors',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'relatedCoverage',
      title: 'Related coverage',
      type: 'array',
      group: 'relatedCoverage',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'post' }], options: { disableNew: true } })],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'photographs',
      title: 'Photographs',
      type: 'array',
      group: 'media',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'register',
      title: 'Registration details',
      type: 'richText',
      group: 'registration',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'faqs',
      title: 'Frequently asked questions',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'customTabs',
      title: 'Custom tabs',
      type: 'array',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
