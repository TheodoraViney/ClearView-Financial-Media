import { TagIcon } from '@sanity/icons/Tag'
import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { OTHER_PROGRAMMES_COUNT } from '@/lib/award-category'
import { AWARD_YEAR_TOKEN, winnerLabelError, type AwardCategoryPageCopyKey } from '@/lib/award-category-copy'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { headingField } from '../fields'

/*
 * The award category template's labels: one document with the fixed id AWARD_CATEGORY_PAGE_ID from `src/brands.ts`,
 * opened from the ClearView folder in the Studio, because the page lives on ClearView Publishing only. The category's
 * own copy (description, eligibility, recognition, judging) lives on the award category document.
 * The design texts are the fields' initial values only: the page renders what is stored, and 404s until this
 * document is published. Screen-reader-only text stays in code.
 */

const label = (
  name: AwardCategoryPageCopyKey,
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

export const awardCategoryPage = defineType({
  name: 'awardCategoryPage',
  title: 'Award category page',
  type: 'document',
  icon: TagIcon,
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'sidebar', title: 'Sidebar' },
  ],
  fields: [
    label('breadcrumbHomeLabel', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.', 'page', 'Home'),
    label('breadcrumbAwardsLabel', 'Breadcrumb awards label', 'First item of the breadcrumb, linking to the awards list.', 'page', 'Awards'),
    label('detailsHeading', 'Category details heading', 'Heading above eligibility, recognition and judging.', 'page', 'Category details'),
    label('eligibilityLabel', 'Eligibility label', 'Label of the eligibility text in Category details.', 'page', 'Eligibility'),
    label('recognisesLabel', 'Recognition label', 'Label of the "what the category recognises" text in Category details.', 'page', 'What the category recognises'),
    label('judgingLabel', 'Judging label', 'Label of the judging context text in Category details.', 'page', 'Judging context'),
    label('winnersHeading', 'Winners heading', 'Heading above the winners and the year selector.', 'page', 'Winners by year'),
    defineField({
      name: 'winnerLabel',
      title: 'Winner card label',
      type: 'string',
      description: `Above the winner's name, for example "2025 winner". Placeholder: ${AWARD_YEAR_TOKEN}, the award year.`,
      group: 'page',
      initialValue: `${AWARD_YEAR_TOKEN} winner`,
      validation: (Rule) => Rule.required().custom((value: string | undefined) => winnerLabelError(value) ?? true),
    }),
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
      description: `Optional. Up to ${OTHER_PROGRAMMES_COUNT} awards editions, shown first in this order on every category page. A pick from the page's own programme is skipped on that page. Empty places fill automatically with the next edition of other programmes (nominations open first, then ceremonies ahead), one per programme. A past edition you pick still shows, without a status.`,
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
      'Status of an edition whose nominations open after today.',
      'sidebar',
      'Launching soon',
    ),
    label(
      'submissionsOpenLabel',
      'Submissions open status',
      'Status of an edition whose nominations are open today. Shown in the brand colour.',
      'sidebar',
      'Submissions open',
    ),
    label(
      'ceremonyDueLabel',
      'Ceremony due status',
      'Status of an edition whose nominations have closed and whose ceremony is still ahead.',
      'sidebar',
      'Ceremony due',
    ),
  ],
  preview: {
    prepare() {
      return { title: 'Award category page', media: TagIcon }
    },
  },
})
