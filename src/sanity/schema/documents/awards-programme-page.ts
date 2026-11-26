import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { OPEN_PROGRAMMES_PINS } from '@/lib/award-category'
import type { AwardsProgrammePageCopyKey } from '@/lib/awards-programme-copy'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { linkField } from '../fields'

/*
 * "Awards page texts": the texts every awards edition page shares, one document with the fixed id
 * AWARDS_PROGRAMME_PAGE_ID from `src/brands.ts`, opened from the Awards folder in the Studio.
 * The edition's own content (standfirst, overview, registration steps, sponsors, judges, winners, FAQ) lives on the
 * edition document.
 * The edition status labels are here too, as the one source for both awards pages: the award category page sidebar
 * reads them from this document.
 * Tabs and fieldsets follow the page from top to bottom; a section's heading and its menu link sit side by side.
 * Section headings are plain strings rendered as h2.
 * The design texts are the fields' initial values only: the page renders what is stored. Screen-reader-only text
 * stays in code.
 */

type FieldOptions = { description?: string; fieldset?: string; group?: string }

const label = (name: AwardsProgrammePageCopyKey, title: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({ name, title, type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

const text = (name: AwardsProgrammePageCopyKey, title: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({ name, title, type: 'text', rows: 2, initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

const heading = (name: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({ name, title: 'Heading', type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

/** A section of the page: its heading and its link in the menu under the header, side by side. */
const section = (name: string, headingName: string, headingText: string, navName: AwardsProgrammePageCopyKey, navText: string) => [
  heading(headingName, headingText, { fieldset: name }),
  label(navName, 'Menu link', navText, { fieldset: name }),
]

export const awardsProgrammePage = defineType({
  name: 'awardsProgrammePage',
  title: 'Awards page texts',
  type: 'document',
  icon: StarIcon,
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'sections', title: 'Sections' },
    { name: 'sidebar', title: 'Sidebar' },
    { name: 'statuses', title: 'Statuses' },
  ],
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } },
    { name: 'previousYear', title: 'Previous year links', options: { columns: 2 } },
    { name: 'overview', title: 'Overview', options: { columns: 2 } },
    { name: 'video', title: 'Highlight video', options: { columns: 2 } },
    { name: 'registration', title: 'Categories and Registration', options: { columns: 2 } },
    { name: 'sponsors', title: 'Sponsors', options: { columns: 2 } },
    { name: 'judges', title: 'Judging panel', options: { columns: 2 } },
    { name: 'finalists', title: 'Finalists', options: { columns: 2 } },
    { name: 'winners', title: 'Winners', options: { columns: 2 } },
    { name: 'acclaim', title: 'Acclaim', options: { columns: 2 } },
    { name: 'faq', title: 'FAQ', options: { columns: 2 } },
    { name: 'sidebarList', title: 'Other awards programmes', options: { columns: 2 } },
    {
      name: 'statusLabels',
      title: 'Edition statuses',
      description: 'Also used on the award category pages.',
      options: { columns: 2 },
    },
  ],
  fields: [
    // Header
    label('breadcrumbHomeLabel', 'Home', 'Home', { group: 'header', fieldset: 'breadcrumb' }),
    label('breadcrumbAwardsLabel', 'Awards', 'Awards', { group: 'header', fieldset: 'breadcrumb' }),
    label('registerLabel', 'Register button', 'Register interest', {
      group: 'header',
      description: 'Hidden when the edition has no register link.',
    }),
    defineField({
      ...linkField({ name: 'sponsorLink', title: 'Sponsor button', group: 'header', required: true, labelRequired: true }),
      initialValue: { kind: 'internal', label: 'Become a Sponsoring Partner' },
    }),
    label('previousYearLabel', 'Previous edition', 'View previous year', { group: 'header', fieldset: 'previousYear' }),
    label('previousYearWinnersLabel', 'Previous winners', 'View previous year winners', {
      group: 'header',
      fieldset: 'previousYear',
    }),

    // Sections, in page order
    ...section('overview', 'overviewHeading', 'Programme Overview', 'navOverviewLabel', 'Overview'),

    ...section('video', 'videoHeading', 'Highlight video', 'navVideoLabel', 'Highlight Video'),
    label('videoDialogTitle', 'Player title', 'Programme highlight video', { fieldset: 'video' }),
    label('videoConsentButton', 'Cookie button', 'Cookie settings', { fieldset: 'video' }),
    text(
      'videoConsentText',
      'Cookie notice',
      'This content is hosted by a third party and sets cookies. Allow functional cookies to view it.',
      { fieldset: 'video', description: 'Shown in the player until the reader allows cookies.' },
    ),

    ...section('registration', 'categoriesHeading', 'Categories and Registration', 'navCategoriesLabel', 'Categories and Registration'),
    text('registrationOpenIntro', 'Intro, nominations open', 'Nominations are open. Follow these steps to enter.', {
      fieldset: 'registration',
    }),
    text(
      'registrationClosedIntro',
      'Intro, nominations closed',
      'The entry window is closed. These steps explain how submissions were made for this programme.',
      { fieldset: 'registration' },
    ),
    label('registrationClosedLabel', 'Closed tag', 'nominations closed', {
      fieldset: 'registration',
      description: 'The year is added in front: "2026 nominations closed".',
    }),

    ...section('sponsors', 'sponsorsHeading', 'Sponsors', 'navSponsorsLabel', 'Sponsors'),
    ...section('judges', 'judgesHeading', 'Judging panel', 'navJudgesLabel', 'Judging Panel'),
    ...section('finalists', 'finalistsHeading', 'Finalists', 'navFinalistsLabel', 'Finalists'),

    ...section('winners', 'winnersHeading', 'Winners', 'navWinnersLabel', 'Winners'),
    label('winnersAllLabel', 'All groups button', 'All', {
      fieldset: 'winners',
      description: 'First of the group buttons above the finalists and winners.',
    }),

    ...section('acclaim', 'marketingKitHeading', 'Acclaim', 'navMarketingKitLabel', 'Acclaim'),
    text('marketingKitText', 'Text', 'The programme provides winner and sponsor opportunities through Annual Acclaim magazine.', {
      fieldset: 'acclaim',
    }),
    label('acclaimLinkLabel', 'Magazine link', 'Annual Acclaim magazine', { fieldset: 'acclaim' }),

    ...section('faq', 'faqHeading', 'FAQ', 'navFaqLabel', 'FAQ'),

    // Sidebar
    heading('otherProgrammesHeading', 'Other awards programmes', { group: 'sidebar', fieldset: 'sidebarList' }),
    label('deadlineLabel', 'Deadline label', 'Deadline', {
      group: 'sidebar',
      fieldset: 'sidebarList',
      description: 'Before the closing date: "Deadline 3 December 2026".',
    }),
    text('openProgrammesEmptyText', 'Text when nothing is open', 'No programmes are currently open for submissions.', {
      group: 'sidebar',
    }),
    defineField({
      ...linkField({ name: 'allAwardsLink', title: 'View all link', group: 'sidebar', required: true, labelRequired: true }),
      initialValue: { kind: 'hub', hub: 'awards', label: 'View all awards' },
    }),
    defineField({
      name: 'otherProgrammes',
      title: 'Pinned editions',
      type: 'array',
      group: 'sidebar',
      description: `Optional. Up to ${OPEN_PROGRAMMES_PINS}, shown first while their nominations are open. Then every other open edition, closing soonest first.`,
      components: { input: AutoFillPicksInput },
      of: [
        defineArrayMember({
          type: 'object',
          name: 'otherProgrammePick',
          title: 'Awards edition',
          icon: StarIcon,
          fields: [
            defineField({
              name: 'edition',
              title: 'Edition',
              type: 'reference',
              to: [{ type: 'awardsProgramme' }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              description: "Leave empty to use the edition's title.",
            }),
          ],
          preview: {
            select: { title: 'title', editionTitle: 'edition.title', startDate: 'edition.startDate' },
            prepare({ title, editionTitle, startDate }: { title?: string; editionTitle?: string; startDate?: string }) {
              return {
                title: title?.trim() || editionTitle || 'No edition',
                subtitle: [title?.trim() && editionTitle, startDate].filter(Boolean).join(' · ') || undefined,
                media: StarIcon,
              }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.max(OPEN_PROGRAMMES_PINS).custom((items: { edition?: { _ref?: string } }[] | undefined) => {
          const refs = (items ?? []).flatMap((item) => (item.edition?._ref ? [item.edition._ref] : []))

          return new Set(refs).size === refs.length ? true : 'Each edition can be picked once'
        }),
    }),

    // Statuses
    label('launchingSoonLabel', 'Launching soon', 'Launching soon', { group: 'statuses', fieldset: 'statusLabels' }),
    label('submissionsOpenLabel', 'Submissions open', 'Submissions open', { group: 'statuses', fieldset: 'statusLabels' }),
    label('ceremonyDueLabel', 'Ceremony due', 'Ceremony due', { group: 'statuses', fieldset: 'statusLabels' }),
    label('winnersAnnouncedLabel', 'Winners announced', 'Winners announced', { group: 'statuses', fieldset: 'statusLabels' }),
  ],
  preview: {
    prepare() {
      return { title: 'Awards page texts', media: StarIcon }
    },
  },
})
