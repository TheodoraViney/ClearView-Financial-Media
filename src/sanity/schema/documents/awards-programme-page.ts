import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { OPEN_PROGRAMMES_PINS } from '@/lib/award-category'
import type { AwardsProgrammePageCopyKey } from '@/lib/awards-programme-copy'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { headingField, linkField } from '../fields'

/*
 * The awards programme template's labels: one document with the fixed id AWARDS_PROGRAMME_PAGE_ID from
 * `src/brands.ts`, opened from the ClearView folder in the Studio, because the page lives on ClearView Publishing only.
 * The edition's own content (standfirst, overview, registration steps, sponsors, judges, winners, FAQ) lives on the
 * edition document.
 * The edition status labels are here too, as the one source for both awards pages: the award category page sidebar
 * reads them from this document.
 * The design texts are the fields' initial values only: the page renders what is stored. Screen-reader-only text
 * stays in code.
 */

const label = (
  name: AwardsProgrammePageCopyKey,
  title: string,
  description: string,
  group: string,
  initialValue: string,
) =>
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

const text = (name: AwardsProgrammePageCopyKey, title: string, description: string, group: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'text',
    rows: 2,
    description,
    group,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

const STATUS_PAGES = 'Used on the awards programme page and in the award category page sidebar.'

export const awardsProgrammePage = defineType({
  name: 'awardsProgrammePage',
  title: 'Awards programme page',
  type: 'document',
  icon: StarIcon,
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'registration', title: 'Registration' },
    { name: 'navigation', title: 'Navigation' },
    { name: 'openProgrammes', title: 'Other awards programmes' },
    { name: 'statuses', title: 'Statuses' },
  ],
  fields: [
    label('breadcrumbHomeLabel', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.', 'page', 'Home'),
    label('breadcrumbAwardsLabel', 'Breadcrumb awards label', 'Second item of the breadcrumb, linking to the awards list.', 'page', 'Awards'),
    label(
      'registerLabel',
      'Register button label',
      "Button linking to the edition's register link. Hidden when the edition has no link.",
      'page',
      'Register interest',
    ),
    defineField({
      ...linkField({
        name: 'sponsorLink',
        title: 'Sponsoring partner button',
        group: 'page',
        required: true,
        labelRequired: true,
        description: 'Second button in the masthead, for example to the ClearView Sponsorship page.',
      }),
      initialValue: { kind: 'internal', label: 'Become a Sponsoring Partner' },
    }),
    label('previousYearLabel', 'Previous year link label', "Link to the programme's previous edition.", 'page', 'View previous year'),
    label(
      'previousYearWinnersLabel',
      'Previous year winners link label',
      "Link to the winners of the programme's previous edition.",
      'page',
      'View previous year winners',
    ),
    heading('overviewHeading', 'Overview heading', 'Heading above the programme overview.', 'Programme Overview'),
    heading('videoHeading', 'Highlight video heading', 'Heading of the highlight video section.', 'Highlight video'),
    label(
      'videoDialogTitle',
      'Highlight video player title',
      'Title at the top of the player that opens over the page.',
      'page',
      'Programme highlight video',
    ),
    heading(
      'categoriesHeading',
      'Categories and Registration heading',
      "Heading of the section with the edition's registration steps. Hidden when the edition has no steps.",
      'Categories and Registration',
      'registration',
    ),
    text(
      'registrationOpenIntro',
      'Intro while nominations are open',
      "Under the heading while the edition's nominations are open or about to open.",
      'registration',
      'Nominations are open. Follow these steps to enter.',
    ),
    label(
      'registrationClosedLabel',
      'Nominations closed tag',
      "Tag beside the heading once the edition's nominations have closed, after the edition's year, for example \"2026 nominations closed\". The page adds the year. While nominations are open, the edition status shows instead.",
      'registration',
      'nominations closed',
    ),
    text(
      'registrationClosedIntro',
      'Intro after nominations close',
      "Under the heading once the edition's nominations have closed.",
      'registration',
      'The entry window is closed. These steps explain how submissions were made for this programme.',
    ),
    label(
      'registrationFaqLinkLabel',
      'FAQ link label',
      'Link under the intro to the FAQ section. Hidden when the edition has no FAQ.',
      'registration',
      'Read the FAQ',
    ),
    heading('sponsorsHeading', 'Sponsors heading', "Heading above the edition's sponsors.", 'Sponsors'),
    heading('judgesHeading', 'Judges heading', 'Heading above the judging panel.', 'Judging panel'),
    heading('winnersHeading', 'Winners heading', 'Heading above the winners.', 'Winners'),
    heading('marketingKitHeading', 'Acclaim heading', "Heading of the section linking to the edition's Acclaim magazine.", 'Acclaim'),
    defineField({
      name: 'marketingKitText',
      title: 'Acclaim text',
      type: 'text',
      rows: 2,
      group: 'page',
      description: 'Text of the Acclaim section.',
      initialValue: 'The programme provides winner and sponsor opportunities through Annual Acclaim magazine.',
      validation: (Rule) => Rule.required(),
    }),
    label(
      'acclaimLinkLabel',
      'Acclaim link label',
      "Link to the edition's Acclaim magazine in the Acclaim section.",
      'page',
      'Annual Acclaim magazine',
    ),
    label(
      'videoConsentText',
      'Video consent text',
      'Shown in the highlight video player until the reader allows functional cookies.',
      'page',
      'This content is hosted by a third party and sets cookies. Allow functional cookies to view it.',
    ),
    label('videoConsentButton', 'Video consent button', 'Button under that text, which opens the cookie settings.', 'page', 'Cookie settings'),
    heading('faqHeading', 'FAQ heading', "Heading above the edition's questions and answers.", 'FAQ'),

    label('navOverviewLabel', 'Overview link', 'In-page navigation link to the programme overview. Hidden when the section is empty.', 'navigation', 'Overview'),
    label('navVideoLabel', 'Highlight video link', 'In-page navigation link to the highlight video. Hidden when the section is empty.', 'navigation', 'Highlight Video'),
    label(
      'navCategoriesLabel',
      'Categories and Registration link',
      'In-page navigation link to the registration steps. Hidden when the section is empty.',
      'navigation',
      'Categories and Registration',
    ),
    label('navSponsorsLabel', 'Sponsors link', 'In-page navigation link to the sponsors. Hidden when the section is empty.', 'navigation', 'Sponsors'),
    label('navJudgesLabel', 'Judges link', 'In-page navigation link to the judging panel. Hidden when the section is empty.', 'navigation', 'Judging Panel'),
    label('navWinnersLabel', 'Winners link', 'In-page navigation link to the winners. Hidden when the section is empty.', 'navigation', 'Winners'),
    label('navMarketingKitLabel', 'Acclaim link', 'In-page navigation link to the Acclaim section. Hidden when the section is empty.', 'navigation', 'Acclaim'),
    label('navFaqLabel', 'FAQ link', 'In-page navigation link to the FAQ. Hidden when the section is empty.', 'navigation', 'FAQ'),

    headingField('otherProgrammesHeading', {
      title: 'Other awards programmes heading',
      defaultLevel: 'h2',
      initialText: 'Other awards programmes',
      required: true,
      group: 'openProgrammes',
      description:
        'Heading of the awards programmes list in the right sidebar, under the banner. Choose the heading level in the style menu. The size on the page stays the same.',
    }),
    defineField({
      ...linkField({
        name: 'allAwardsLink',
        title: 'View all awards link',
        group: 'openProgrammes',
        required: true,
        labelRequired: true,
        description: 'Above the awards programmes list in the right sidebar, for example to the Awards listing.',
      }),
      initialValue: { kind: 'hub', hub: 'awards', label: 'View all awards' },
    }),
    text(
      'openProgrammesEmptyText',
      'No open programmes text',
      'Shown under the heading when no edition is open for submissions.',
      'openProgrammes',
      'No programmes are currently open for submissions.',
    ),
    label(
      'deadlineLabel',
      'Deadline label',
      "Before the nominations closing date on each row of the list, for example \"Deadline 3 December 2026\".",
      'openProgrammes',
      'Deadline',
    ),
    defineField({
      name: 'otherProgrammes',
      title: 'Pinned awards programmes',
      type: 'array',
      group: 'openProgrammes',
      description: `Optional. Up to ${OPEN_PROGRAMMES_PINS} awards editions, shown first in this order on every awards programme page while their nominations are open. A pick whose nominations have closed is hidden, and the page's own edition is skipped on its page. After the picks the list shows every other edition whose nominations are open, closing soonest first, from every publication. Each row shows the title, its status and the deadline.`,
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
              description: 'Its title, link, status and nominations closing date are used on the page.',
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

    label(
      'launchingSoonLabel',
      'Launching soon status',
      `Status of an edition whose nominations open after today. ${STATUS_PAGES}`,
      'statuses',
      'Launching soon',
    ),
    label(
      'submissionsOpenLabel',
      'Submissions open status',
      `Status of an edition whose nominations are open today. Shown in the brand colour. ${STATUS_PAGES}`,
      'statuses',
      'Submissions open',
    ),
    label(
      'ceremonyDueLabel',
      'Ceremony due status',
      `Status of an edition whose nominations have closed and whose ceremony is still ahead. ${STATUS_PAGES}`,
      'statuses',
      'Ceremony due',
    ),
    label(
      'winnersAnnouncedLabel',
      'Winners announced status',
      `Status of an edition whose ceremony has passed and which has winners. ${STATUS_PAGES}`,
      'statuses',
      'Winners announced',
    ),
  ],
  preview: {
    prepare() {
      return { title: 'Awards programme page', media: StarIcon }
    },
  },
})
