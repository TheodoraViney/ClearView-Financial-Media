import { StarIcon } from '@sanity/icons/Star'
import { defineField, defineType } from 'sanity'

/**
 * One AwardCategory to one Company, inside an AwardsProgramme. Optional people name the individuals who won (one item per
 * person), and an optional display name overrides the company title on the site (the name a merged firm won under). An
 * optional banner, the designed winner image, shows on the awards programme page instead of the text row.
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
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Optional. The people who won, for awards given to individuals. Add one item per person.',
    }),
    defineField({
      name: 'banner',
      title: 'Banner',
      type: 'image',
      description:
        'Optional. The designed winner banner (award, company logo and category). Shown on the page instead of the text row, with the category and winner as a caption under it.',
    }),
    defineField({
      name: 'displayName',
      title: 'Name shown on site',
      type: 'string',
      description:
        'Optional. Shown instead of the company name for this award only, for example the name the firm traded under when it won. Leave empty to show the company name. The logo and the profile link still come from the company.',
    }),
  ],
  preview: {
    select: {
      category: 'category.title',
      company: 'company.title',
      displayName: 'displayName',
      people: 'people',
      group: 'categoryGroup',
      media: 'banner',
    },
    prepare({ category, company, displayName, people, group, media }) {
      const name = [...(Array.isArray(people) ? people : []), displayName || company].filter(Boolean).join(', ')

      return {
        title: [name, category].filter(Boolean).join(' — ') || 'Incomplete winner',
        subtitle: group || undefined,
        media,
      }
    },
  },
})
