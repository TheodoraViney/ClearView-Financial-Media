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
  fieldsets: [{ name: 'award', title: 'Award', options: { columns: 2 } }],
  fields: [
    // The heading the category sat under in the source, e.g. "MULTI-FAMILY OFFICES CATEGORIES"; 177 distinct values.
    defineField({
      name: 'categoryGroup',
      title: 'Category group',
      type: 'string',
      description: 'Groups the winners gallery.',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'awardCategory' }],
      fieldset: 'award',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'company',
      title: 'Winner',
      type: 'reference',
      to: [{ type: 'company' }],
      fieldset: 'award',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'For awards given to individuals, one item per person.',
    }),
    defineField({
      name: 'banner',
      title: 'Banner',
      type: 'image',
      description: 'Shown instead of the text row, with the category and winner as its caption.',
    }),
    defineField({
      name: 'displayName',
      title: 'Name shown on site',
      type: 'string',
      // For example the name the firm traded under when it won.
      description: 'Replaces the company name for this award only; the logo and profile link still come from the company.',
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
