import { StarIcon } from '@sanity/icons/Star'
import { defineField, defineType } from 'sanity'

/**
 * One AwardCategory to one Company, inside an AwardsProgramme.
 *
 * 2,981 pairs were parsed out of the `cyph_winners` wysiwyg blob across 45
 * events. Winner is a row, not a document: template 07 gives AwardCategory its
 * own page, but no template gives a Winner one, so a Winner needs no address.
 * That keeps 2,981 documents off the Sanity Growth 25,000 ceiling.
 */
export const winner = defineType({
  name: 'winner',
  title: 'Winner',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'categoryGroup',
      title: 'Category group',
      type: 'string',
      description:
        'Heading the category sat under in the source, for example "MULTI-FAMILY OFFICES CATEGORIES". Groups the winners gallery; 177 distinct values.',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'awardCategory' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'company',
      title: 'Winner',
      type: 'reference',
      to: [{ type: 'company' }],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      category: 'category.title',
      company: 'company.title',
      group: 'categoryGroup',
    },
    prepare({ category, company, group }) {
      return {
        title: [company, category].filter(Boolean).join(' — ') || 'Incomplete winner',
        subtitle: group || undefined,
      }
    },
  },
})
