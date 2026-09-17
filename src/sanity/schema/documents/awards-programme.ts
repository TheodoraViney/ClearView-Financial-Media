import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { EVENT_COUNTRIES, altField, legacyWpIdField, timeField } from '../fields'

/**
 * One yearly edition of an awards programme, for example "The Twelfth
 * WealthBriefingAsia Greater China Awards 2027". 60 records.
 *
 * An edition, not the evergreen programme: template 06 describes a judging
 * panel and a winners gallery, and a programme running for 14 years does not
 * have one panel. The evergreen name lives on awardsProgrammeGroup.
 *
 * Split from conferenceEvent because the source itself gates the fields. Three
 * in-form notices mark the Judges and Nominations tabs as Awards-only, and the
 * data agrees: judges panels and winners appear on awards-tagged records and
 * nowhere else. The "no per-brand subtypes" rule in README section 3 is about
 * brands and does not reach this.
 *
 * URLs are preserved: /events/{slug}/ stays as it is on
 * clearviewpublishing.com.
 */
export const awardsProgramme = defineType({
  name: 'awardsProgramme',
  title: 'Awards programme edition',
  type: 'document',
  icon: StarIcon,
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'schedule', title: 'Date and time' },
    { name: 'judges', title: 'Judges' },
    { name: 'nominations', title: 'Nominations and winners' },
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
      name: 'programme',
      title: 'Awards programme',
      type: 'reference',
      to: [{ type: 'awardsProgrammeGroup' }],
      group: 'details',
      description: 'The evergreen programme this edition belongs to.',
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
      name: 'keyDates',
      title: 'Key dates',
      type: 'richText',
      group: 'details',
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
      name: 'judgesIntro',
      title: 'Judges section intro',
      type: 'richText',
      group: 'judges',
    }),
    defineField({
      name: 'judgesPanels',
      title: 'Judging panels',
      type: 'array',
      group: 'judges',
      of: [defineArrayMember({ type: 'personGroup' })],
    }),

    defineField({
      name: 'nominationsOpeningDate',
      title: 'Nominations opening date',
      type: 'date',
      group: 'nominations',
    }),
    defineField({
      name: 'nominationsClosingDate',
      title: 'Nominations closing date',
      type: 'date',
      group: 'nominations',
      validation: (Rule) =>
        Rule.custom((closing, context) => {
          const opening = (context.document as { nominationsOpeningDate?: string } | undefined)
            ?.nominationsOpeningDate

          if (closing && opening && closing < opening) {
            return 'Nominations cannot close before they open'
          }

          return true
        }),
    }),
    defineField({
      name: 'winnersAnnouncementDate',
      title: 'Winners announcement date',
      type: 'date',
      group: 'nominations',
    }),
    defineField({
      name: 'categoriesContent',
      title: 'Categories and entry process',
      type: 'richText',
      group: 'nominations',
      description:
        'The prose "Categories" tab from the source. The typed categories are the Winners rows below.',
    }),
    defineField({
      name: 'winners',
      title: 'Winners',
      type: 'array',
      group: 'nominations',
      of: [defineArrayMember({ type: 'winner' })],
      description: 'Parsed out of the legacy Winners wysiwyg. 2,981 rows across 45 editions.',
    }),
    defineField({
      name: 'finalists',
      title: 'Finalists',
      type: 'richText',
      group: 'nominations',
    }),
    defineField({
      name: 'previousWinners',
      title: 'Previous winners',
      type: 'richText',
      group: 'nominations',
      description: 'Prose in the source and kept as prose. Only the current edition is typed.',
    }),
    defineField({
      name: 'awardWinnersSupplement',
      title: 'Award winners supplement',
      type: 'richText',
      group: 'nominations',
    }),
    defineField({
      name: 'acclaim',
      title: 'Acclaim magazine',
      type: 'reference',
      to: [{ type: 'acclaim' }],
      group: 'nominations',
    }),
    defineField({
      name: 'charityPartners',
      title: 'Charity partners',
      type: 'array',
      group: 'nominations',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'company' }] })],
      validation: (Rule) => Rule.unique(),
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
      name: 'winnerVideos',
      title: 'Winner videos',
      type: 'videoGallery',
      group: 'media',
    }),
    defineField({
      name: 'highlightsVideoId',
      title: 'Highlights video (Vimeo ID)',
      type: 'string',
      group: 'media',
      validation: (Rule) => Rule.regex(/^\d+$/, { name: 'Vimeo ID', invert: false }),
    }),
    defineField({
      name: 'highlightVideoThumbnail',
      title: 'Highlights video thumbnail',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      fields: [altField],
      hidden: ({ document }) => !document?.highlightsVideoId,
      validation: (Rule) =>
        Rule.custom((thumbnail, context) => {
          const videoId = (context.document as { highlightsVideoId?: string } | undefined)
            ?.highlightsVideoId

          if (videoId && !(thumbnail as { asset?: unknown } | undefined)?.asset) {
            return 'A highlights video usually needs a thumbnail'
          }

          return true
        }).warning(),
    }),
    defineField({
      name: 'hidePreviousYearsHighlightVideo',
      title: "Hide the previous year's highlights video",
      type: 'boolean',
      group: 'media',
      initialValue: false,
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
      startDate: 'startDate',
      programme: 'programme.title',
      media: 'logo',
    },
    prepare({ title, startDate, programme, media }) {
      return {
        title: title || 'Untitled edition',
        subtitle: [startDate, programme].filter(Boolean).join(' · ') || 'No date',
        media,
      }
    },
  },
})
