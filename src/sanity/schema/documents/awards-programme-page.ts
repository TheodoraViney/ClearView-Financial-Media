import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { OTHER_PROGRAMMES_COUNT } from '@/lib/award-category'
import type { AwardsProgrammePageCopyKey } from '@/lib/awards-programme-copy'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { headingField } from '../fields'

/*
 * The awards programme template's labels: one document with the fixed id AWARDS_PROGRAMME_PAGE_ID from
 * `src/brands.ts`, opened from the ClearView folder in the Studio, because the page lives on ClearView Publishing only.
 * The edition's own content (standfirst, overview, judges, winners, categories) lives on the edition document.
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

const STATUS_PAGES = 'Used on the awards programme page and in the award category page sidebar.'

export const awardsProgrammePage = defineType({
  name: 'awardsProgrammePage',
  title: 'Awards programme page',
  type: 'document',
  icon: StarIcon,
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'navigation', title: 'Navigation' },
    { name: 'sidebar', title: 'Sidebar' },
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
    label('previousYearLabel', 'Previous year link label', "Link to the programme's previous edition.", 'page', 'View previous year'),
    label(
      'previousYearWinnersLabel',
      'Previous year winners link label',
      "Link to the winners of the programme's previous edition.",
      'page',
      'View previous year winners',
    ),
    heading('overviewHeading', 'Overview heading', 'Heading above the programme overview.', 'Programme overview'),
    heading('videoHeading', 'Highlight video heading', 'Heading above the highlights video.', 'Programme highlight video'),
    heading('judgesHeading', 'Judges heading', 'Heading above the judging panel.', 'Judging panel'),
    label('viewBiographyLabel', 'View biography label', "Button that opens a judge's biography.", 'page', 'View biography'),
    label('hideBiographyLabel', 'Hide biography label', "Button that closes a judge's biography.", 'page', 'Hide biography'),
    heading('winnersHeading', 'Winners heading', 'Heading above the winners.', 'Winners'),
    label('allCategoriesLabel', 'All categories filter label', 'First filter above the winners, showing every category.', 'page', 'All categories'),
    heading('categoriesHeading', 'Categories heading', 'Heading above the entry categories.', 'Categories'),
    heading('marketingKitHeading', 'Marketing kit heading', 'Heading above the awards marketing kit.', 'Awards marketing kit'),
    defineField({
      name: 'marketingKitText',
      title: 'Marketing kit text',
      type: 'text',
      rows: 2,
      group: 'page',
      description: 'Text of the awards marketing kit section.',
      initialValue: 'The programme provides winner and sponsor opportunities through Annual Acclaim magazine.',
      validation: (Rule) => Rule.required(),
    }),
    label(
      'acclaimLinkLabel',
      'Acclaim link label',
      "Link to the edition's Acclaim magazine in the marketing kit section.",
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

    label('navOverviewLabel', 'Overview link', 'In-page navigation link to the programme overview. Hidden when the section is empty.', 'navigation', 'Programme overview'),
    label('navJudgesLabel', 'Judges link', 'In-page navigation link to the judging panel. Hidden when the section is empty.', 'navigation', 'Judging panel'),
    label('navWinnersLabel', 'Winners link', 'In-page navigation link to the winners. Hidden when the section is empty.', 'navigation', 'Winners'),
    label('navCategoriesLabel', 'Categories link', 'In-page navigation link to the categories. Hidden when the section is empty.', 'navigation', 'Categories'),
    label(
      'navMarketingKitLabel',
      'Marketing kit link',
      'In-page navigation link to the awards marketing kit. Hidden when the section is empty.',
      'navigation',
      'Awards marketing kit',
    ),

    headingField('otherProgrammesHeading', {
      title: 'Other programmes heading',
      defaultLevel: 'h2',
      initialText: 'Other awards programmes',
      required: true,
      group: 'sidebar',
      description:
        'Heading of the awards programmes list. Choose the heading level in the style menu. The size on the page stays the same.',
    }),
    defineField({
      name: 'otherProgrammes',
      title: 'Awards programmes',
      type: 'array',
      group: 'sidebar',
      description: `Optional. Up to ${OTHER_PROGRAMMES_COUNT} awards editions, shown first in this order on every awards programme page. A pick from the page's own programme is skipped on that page. Empty places fill automatically with the next edition of other programmes (nominations open first, then ceremonies ahead), one per programme. A past edition you pick still shows, without a status.`,
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
              description: 'Its title, link, dates, country and status are used on the page.',
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
        Rule.max(OTHER_PROGRAMMES_COUNT).custom((items: { edition?: { _ref?: string } }[] | undefined) => {
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
