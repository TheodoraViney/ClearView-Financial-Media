import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { EVENT_COUNTRIES, altField, isUniqueEventSlug, legacyWpIdField, linkField, timeField } from '../fields'
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
  // In the order of the page's sections (Claude Design v1.11), so the Studio reads top to bottom like the page.
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'overview', title: 'Overview' },
    { name: 'video', title: 'Highlight video' },
    { name: 'registration', title: 'Categories and Registration' },
    { name: 'sponsors', title: 'Sponsors' },
    { name: 'judges', title: 'Judging panel' },
    { name: 'winners', title: 'Finalists and Winners' },
    { name: 'acclaim', title: 'Acclaim' },
    { name: 'faq', title: 'FAQ' },
    // Legacy WordPress fields only, all hidden: tab hidden in the Studio. Remove before launch if unused.
    { name: 'extra', title: 'Legacy', hidden: true },
  ],
  fieldsets: [
    { name: 'dates', title: 'Dates', options: { columns: 2 } },
    { name: 'nominations', title: 'Nominations', options: { columns: 2 } },
    { name: 'location', title: 'Location', options: { columns: 2 } },
    { name: 'video', title: 'Highlights video' },
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
      name: 'programme',
      title: 'Awards programme',
      type: 'reference',
      to: [{ type: 'awardsProgrammeGroup' }],
      group: 'header',
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
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 2,
      group: 'header',
      validation: (Rule) => Rule.max(200).warning('Longer than 200 characters; keep it to a sentence or two'),
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
      title: 'Hide dates',
      type: 'boolean',
      description: 'Hides the dates everywhere on the site, e.g. until they are confirmed.',
      group: 'header',
      fieldset: 'dates',
      initialValue: false,
    }),
    defineField({
      name: 'nominationsOpeningDate',
      title: 'Opening date',
      type: 'date',
      group: 'header',
      fieldset: 'nominations',
    }),
    defineField({
      name: 'nominationsClosingDate',
      title: 'Closing date',
      type: 'date',
      group: 'header',
      fieldset: 'nominations',
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
    linkField({
      name: 'registerLink',
      title: 'Register button',
      group: 'header',
      // Usually a web address: the nominations form (Jotform). An empty label uses registerLabel from Awards page texts.
    }),
    defineField({
      name: 'registerButtonLink',
      title: 'Register now button link (old)',
      type: 'url',
      // From WordPress, copied into registerLink above; not used on the site. Hidden: a hidden group alone still shows
      // the field under "All fields".
      group: 'extra',
      hidden: true,
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),

    defineField({
      name: 'body',
      title: 'Introduction',
      type: 'richText',
      group: 'overview',
    }),

    defineField({
      name: 'highlightsVideoId',
      title: 'Vimeo ID',
      type: 'string',
      group: 'video',
      fieldset: 'video',
      validation: (Rule) => Rule.regex(/^\d+$/, { name: 'Vimeo ID', invert: false }),
    }),
    defineField({
      name: 'highlightVideoThumbnail',
      title: 'Thumbnail',
      type: 'image',
      group: 'video',
      fieldset: 'video',
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
      group: 'video',
    }),

    defineField({
      name: 'registrationSteps',
      title: 'Registration steps',
      type: 'array',
      group: 'registration',
      description: 'Empty: the Categories and Registration section is hidden.',
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
              description: 'Numbered on the page. Start with a bold lead-in if you like, e.g. "Check eligibility."',
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
      name: 'sponsorTypes',
      title: 'Sponsors',
      type: 'array',
      group: 'sponsors',
      description: 'Grouped by tier; logos come from the company records.',
      of: [defineArrayMember({ type: 'companyGroup', title: 'Sponsor tier' })],
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
      name: 'finalistsIntro',
      title: 'Finalists intro',
      type: 'richText',
      group: 'winners',
    }),
    defineField({
      name: 'finalistRows',
      title: 'Finalists',
      type: 'array',
      group: 'winners',
      of: [defineArrayMember({ type: 'finalistRow' })],
    }),
    defineField({
      name: 'winners',
      title: 'Winners',
      type: 'array',
      group: 'winners',
      // Parsed out of the legacy Winners wysiwyg: 2,981 rows across 45 editions.
      of: [defineArrayMember({ type: 'winner' })],
    }),

    defineField({
      name: 'acclaim',
      title: 'Acclaim magazine',
      type: 'reference',
      to: [{ type: 'acclaim' }],
      group: 'acclaim',
    }),

    defineField({
      name: 'faq',
      title: 'Frequently asked questions',
      type: 'array',
      group: 'faq',
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

    // Legacy WordPress fields, all hidden in the Studio, data kept. Remove before launch if unused.
    defineField({
      name: 'keyDates',
      title: 'Key dates',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    {
      ...timeField('startTime', 'Start time', 'extra'),
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    },
    {
      ...timeField('endTime', 'End time', 'extra'),
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    },
    defineField({
      name: 'timezoneCode',
      title: 'Timezone code',
      type: 'string',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      description: 'Free text in the source, for example "EST".',
    }),
    defineField({
      name: 'winnersAnnouncementDate',
      title: 'Winners announcement date',
      type: 'date',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'categoriesContent',
      title: 'Categories and entry process',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. A later script moves the
      // entry steps of 12 editions into `registrationSteps`. Remove before launch if unused.
      hidden: true,
      description:
        'The prose "Categories" tab from the source. The typed categories are the Winners rows below.',
    }),
    defineField({
      name: 'previousWinners',
      title: 'Previous winners',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      description: 'Prose in the source and kept as prose. Only the current edition is typed.',
    }),
    defineField({
      name: 'awardWinnersSupplement',
      title: 'Award winners supplement',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'charityPartners',
      title: 'Charity partners',
      type: 'array',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'company' }] })],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'sponsorBenefits',
      title: 'Sponsor benefits',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'sponsorVideos',
      title: 'Sponsor videos',
      type: 'videoGallery',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'winnerVideos',
      title: 'Winner videos',
      type: 'videoGallery',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
    }),
    defineField({
      name: 'hidePreviousYearsHighlightVideo',
      title: "Hide the previous year's highlights video",
      type: 'boolean',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      initialValue: false,
    }),
    defineField({
      name: 'photographs',
      title: 'Photographs',
      type: 'array',
      group: 'extra',
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
      name: 'register',
      title: 'Registration details',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
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
    defineField({
      name: 'finalists',
      title: 'Finalists (old text)',
      type: 'richText',
      group: 'extra',
      // Legacy WordPress prose, split by hand into `finalistRows`; the page shows it only for an edition without rows.
      hidden: true,
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
