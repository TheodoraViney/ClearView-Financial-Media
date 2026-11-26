import { TagIcon } from '@sanity/icons/Tag'
import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { OTHER_PROGRAMMES_COUNT } from '@/lib/award-category'
import { AWARD_YEAR_TOKEN, winnerLabelError, type AwardCategoryPageCopyKey } from '@/lib/award-category-copy'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

/*
 * "Category page texts": the award category template's labels, one document with the fixed id AWARD_CATEGORY_PAGE_ID
 * from `src/brands.ts`, opened from the Awards folder in the Studio. The category's own copy (description,
 * eligibility, recognition, judging) lives on the award category document.
 * Fieldsets follow the page from top to bottom, short fields two to a row. The sidebar heading is a plain string
 * rendered as h2.
 * The design texts are the fields' initial values only: the page renders what is stored, and 404s until this
 * document is published. Screen-reader-only text stays in code. The sidebar's edition status labels are shared with the
 * awards programme page and live in the "Awards page texts" document (awards-programme-page.ts).
 */

const label = (name: AwardCategoryPageCopyKey, title: string, initialValue: string, fieldset: string) =>
  defineField({
    name,
    title,
    type: 'string',
    group: 'page',
    fieldset,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

export const awardCategoryPage = defineType({
  name: 'awardCategoryPage',
  title: 'Category page texts',
  type: 'document',
  icon: TagIcon,
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'sidebar', title: 'Sidebar' },
  ],
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } },
    { name: 'details', title: 'Category details', options: { columns: 2 } },
    { name: 'winners', title: 'Winners by year', options: { columns: 2 } },
  ],
  fields: [
    label('breadcrumbHomeLabel', 'Home', 'Home', 'breadcrumb'),
    label('breadcrumbAwardsLabel', 'Awards', 'Awards', 'breadcrumb'),

    label('detailsHeading', 'Heading', 'Category details', 'details'),
    label('eligibilityLabel', 'Eligibility', 'Eligibility', 'details'),
    label('recognisesLabel', 'Recognition', 'What the category recognises', 'details'),
    label('judgingLabel', 'Judging', 'Judging context', 'details'),

    label('winnersHeading', 'Heading', 'Winners by year', 'winners'),
    defineField({
      name: 'winnerLabel',
      title: 'Winner card label',
      type: 'string',
      description: `${AWARD_YEAR_TOKEN} becomes the year: "2025 winner".`,
      group: 'page',
      fieldset: 'winners',
      initialValue: `${AWARD_YEAR_TOKEN} winner`,
      validation: (Rule) => Rule.required().custom((value: string | undefined) => winnerLabelError(value) ?? true),
    }),

    defineField({
      name: 'otherProgrammesHeading',
      title: 'Heading',
      type: 'string',
      group: 'sidebar',
      initialValue: 'Other awards programmes',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'otherProgrammes',
      title: 'Pinned editions',
      type: 'array',
      group: 'sidebar',
      description: `Optional. Up to ${OTHER_PROGRAMMES_COUNT}, shown first. Empty places fill with upcoming editions of other programmes.`,
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
        Rule.max(OTHER_PROGRAMMES_COUNT).custom((items: { edition?: { _ref?: string } }[] | undefined) => {
          const refs = (items ?? []).flatMap((item) => (item.edition?._ref ? [item.edition._ref] : []))

          return new Set(refs).size === refs.length ? true : 'Each edition can be picked once'
        }),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Category page texts', media: TagIcon }
    },
  },
})
