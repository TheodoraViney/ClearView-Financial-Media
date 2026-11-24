import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { EVENT_COUNTRIES, altField, isUniqueEventSlug, legacyWpIdField, timeField } from '../fields'
import { paragraphsBlock, paragraphsWithListsBlock } from '../objects/rich-text'

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
    { name: 'faq', title: 'FAQ' },
    // Legacy WordPress fields only, all hidden: tab hidden in the Studio. Remove before launch if unused.
    { name: 'extra', title: 'Extra tabs', hidden: true },
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
      options: { source: 'title', maxLength: 96, isUnique: isUniqueEventSlug },
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 2,
      group: 'details',
      description: 'Optional. One or two sentences under the page title. Hidden on the page when empty.',
      validation: (Rule) => Rule.max(200).warning('Longer than 200 characters; keep it to a sentence or two'),
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
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),

    defineField({
      name: 'startDate',
      title: 'Start date',
      type: 'date',
      group: 'schedule',
      validation: (Rule) => Rule.required(),
    }),
    {
      ...timeField('startTime', 'Start time', 'schedule'),
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    },
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
    {
      ...timeField('endTime', 'End time', 'schedule'),
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    },
    defineField({
      name: 'timezoneCode',
      title: 'Timezone code',
      type: 'string',
      group: 'schedule',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'categoriesContent',
      title: 'Categories and entry process',
      type: 'richText',
      group: 'nominations',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. A later script moves the
      // entry steps of 12 editions into `registrationSteps`. Remove before launch if unused.
      hidden: true,
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
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'previousWinners',
      title: 'Previous winners',
      type: 'richText',
      group: 'nominations',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      description: 'Prose in the source and kept as prose. Only the current edition is typed.',
    }),
    defineField({
      name: 'awardWinnersSupplement',
      title: 'Award winners supplement',
      type: 'richText',
      group: 'nominations',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'company' }] })],
      validation: (Rule) => Rule.unique(),
    }),

    defineField({
      name: 'sponsorTypes',
      title: 'Sponsors',
      type: 'array',
      group: 'sponsors',
      description:
        'Optional. Sponsors grouped by tier, for example "Headline Sponsor", in the order shown on the page. Each tier lists its companies in order; the logo comes from the company. The section is hidden when empty.',
      of: [defineArrayMember({ type: 'companyGroup', title: 'Sponsor tier' })],
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
      name: 'winnerVideos',
      title: 'Winner videos',
      type: 'videoGallery',
      group: 'media',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
      name: 'highlightVideoDescription',
      title: 'Highlights video description',
      type: 'text',
      rows: 3,
      group: 'media',
      description: 'Optional. Short text next to the highlights video. Hidden on the page when empty.',
    }),
    defineField({
      name: 'hidePreviousYearsHighlightVideo',
      title: "Hide the previous year's highlights video",
      type: 'boolean',
      group: 'media',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      initialValue: false,
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
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'registrationSteps',
      title: 'Registration steps',
      type: 'array',
      group: 'registration',
      description:
        'Optional. The numbered steps in the Categories and Registration section, in this order. The section is hidden when there are none.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'registrationStep',
          title: 'Step',
          fields: [
            defineField({
              name: 'text',
              title: 'Text',
              type: 'array',
              description:
                'The page numbers the steps. Start with the lead-in and bold it if you like, for example "Check eligibility." Then any text: paragraphs, lists, links, bold and italic.',
              of: [paragraphsWithListsBlock],
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { text: 'text' },
            prepare({ text }: { text?: { children?: { text?: string }[] }[] }) {
              const first = (text?.[0]?.children ?? []).map((span) => span.text ?? '').join('').split('\n')[0].trim()

              return { title: first || 'Empty step' }
            },
          },
        }),
      ],
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
      name: 'faq',
      title: 'Frequently asked questions',
      type: 'array',
      group: 'faq',
      description: 'Optional. Questions and answers in the FAQ section, in this order. The section is hidden when empty.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faqItem',
          title: 'Question',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'array',
              description: 'Bold, italic and links only.',
              of: [paragraphsBlock],
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'question' },
            prepare({ title }: { title?: string }) {
              return { title: title || 'Untitled question' }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'faqs',
      title: 'Frequently asked questions (old)',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress prose (Q) and A) paragraphs): a later script splits it into `faq`, then the field goes.
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
