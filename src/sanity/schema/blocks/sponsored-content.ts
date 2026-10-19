import { BillIcon } from '@sanity/icons/Bill'
import { defineField, defineType, type ReferenceFilterResolver } from 'sanity'

import { adminLabelField, linkField } from '../fields'
import { postsOfPageBrand } from './top-stories'

// Only sponsored posts can be picked: the page brand's posts (every editorial brand on ClearView) that have a sponsor.
const sponsoredPostsOfPageBrand: ReferenceFilterResolver = async (context) => {
  const { filter, params } = await postsOfPageBrand(context)

  return { filter: filter ? `(${filter}) && defined(sponsor)` : 'defined(sponsor)', params }
}

/**
 * One hand-picked sponsored post as a card: image, sponsor name, title and
 * standfirst, with the sponsor's logo and a link to its company profile.
 * No auto-fill. A post whose sponsor is removed later is not rendered.
 */
export const sponsoredContent = defineType({
  name: 'sponsoredContent',
  title: 'Sponsored content',
  type: 'object',
  icon: BillIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Shown above the card.',
      initialValue: 'Sponsored Content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      ...linkField({ required: true, labelRequired: true, description: 'The "All sponsored articles" link beside the label.' }),
      initialValue: { kind: 'internal', label: 'All Sponsored Articles' },
    }),
    defineField({
      name: 'post',
      title: 'Post',
      type: 'reference',
      to: [{ type: 'post' }],
      description: 'Only posts with a sponsor can be picked. Set the sponsor on the post first.',
      options: { filter: sponsoredPostsOfPageBrand, disableNew: true },
      validation: (Rule) => [
        Rule.required(),
        // The site hides the block once the picked post loses its sponsor; say so here instead of failing silently.
        Rule.custom(async (value: { _ref?: string } | undefined, context) => {
          if (!value?._ref) {
            return true
          }

          const sponsored = await context
            .getClient({ apiVersion: '2026-09-01' })
            .fetch<boolean>('defined(*[_id == $id][0].sponsor)', { id: value._ref })

          return sponsored || 'This post has no sponsor, so the block is hidden on the site. Set a sponsor on the post or pick another'
        }).warning(),
      ],
    }),
    defineField({
      name: 'profileLabel',
      title: 'Company profile link label',
      type: 'string',
      description: "The link to the sponsor's company profile.",
      initialValue: 'Company Profile',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      adminLabel: 'adminLabel',
      label: 'label',
      title: 'post.title',
      sponsor: 'post.sponsor.title',
      media: 'post.image',
    },
    prepare({ adminLabel, label, title, sponsor, media }) {
      return {
        title: adminLabel || title || label || 'Sponsored content',
        subtitle: ['Sponsored content', sponsor ?? 'No sponsor'].join(' · '),
        media,
      }
    },
  },
})
