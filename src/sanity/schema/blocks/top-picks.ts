import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType, type ReferenceFilterResolver } from 'sanity'

import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { adminLabelField, headingField, headingText, linkField } from '../fields'
import { TOP_PICKS_POST_COUNT, postsOfPageBrand } from './shared'

export { TOP_PICKS_POST_COUNT }

type Ref = { _ref?: string }

// Sponsored content never runs in Top Picks: the page brand's posts without a sponsor.
const unsponsoredPostsOfPageBrand: ReferenceFilterResolver = async (context) => {
  const { filter, params } = await postsOfPageBrand(context)

  return { filter: filter ? `(${filter}) && !defined(sponsor)` : '!defined(sponsor)', params }
}

/**
 * Three editorial post cards. Picks come first; the page query fills the empty places with the brand's newest posts
 * from the last seven days, then older ones, sponsored posts excluded.
 */
export const topPicks = defineType({
  name: 'topPicks',
  title: 'Top picks',
  type: 'object',
  icon: StarIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Top Picks', required: true }),
    defineField({
      ...linkField({ required: true, labelRequired: true, description: 'The "View all" link beside the heading.' }),
      initialValue: { kind: 'external', external: '/categories', label: 'View all top picks' },
    }),
    defineField({
      name: 'posts',
      title: 'Picks',
      type: 'array',
      // Lists what the site fills automatically right now, with Pin buttons.
      components: { input: AutoFillPicksInput },
      description: `Up to ${TOP_PICKS_POST_COUNT}, in display order. Sponsored posts cannot be picked. Empty places fill with the newest posts of the last seven days, then older ones.`,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: { filter: unsponsoredPostsOfPageBrand, disableNew: true },
        }),
      ],
      validation: (Rule) =>
        Rule.max(TOP_PICKS_POST_COUNT)
          .unique()
          // A sponsor set on the post after it was picked: the site drops it, so say so here.
          .custom(async (picks: Ref[] | undefined, context) => {
            const ids = (picks ?? []).flatMap((ref) => (ref._ref ? [ref._ref] : []))

            if (ids.length === 0) {
              return true
            }

            const sponsored = await context
              .getClient({ apiVersion: '2026-09-01' })
              .fetch<{ _id: string; title?: string } | null>('*[_id in $ids && defined(sponsor)][0]{ _id, title }', {
                ids,
              })

            return sponsored
              ? `"${sponsored.title || sponsored._id}" is sponsored content and does not show in Top Picks; remove it`
              : true
          }),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', posts: 'posts' },
    prepare({ adminLabel, heading, posts }) {
      const count = Array.isArray(posts) ? posts.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Top picks',
        subtitle: `Top picks · ${count} ${count === 1 ? 'pick' : 'picks'}, then the last 7 days`,
      }
    },
  },
})
