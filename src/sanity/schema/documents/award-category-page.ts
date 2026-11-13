import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

import { AWARD_YEAR_TOKEN, winnerLabelError, type AwardCategoryPageCopyKey } from '@/lib/award-category-copy'

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
    label('otherProgrammesHeading', 'Other programmes heading', 'Heading of the upcoming editions of other programmes.', 'sidebar', 'Other awards programmes'),
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
