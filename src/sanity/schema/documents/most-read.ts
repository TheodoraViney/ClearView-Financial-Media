import { TrendUpwardIcon } from '@sanity/icons/TrendUpward'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isEditorialBrandKey } from '@/brands'

/*
 * The "Most read" list in the article and articles-list sidebars, one
 * document per editorial brand with the fixed id `mostReadDocumentId(key)`
 * from `src/brands.ts`, opened from each brand folder in the Studio. Kept out
 * of Brand settings: that document feeds every page of the brand, so editing
 * the list there would expire them all.
 *
 * Curated by the editor for now; a measured source may replace it later.
 */

const brandKeyOf = (id: string | undefined): string =>
  String(id ?? '').replace(/^drafts\./, '').replace(/^most-read-/, '')

export const mostRead = defineType({
  name: 'mostRead',
  title: 'Most read',
  type: 'document',
  icon: TrendUpwardIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Most read',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'posts',
      title: 'Posts',
      type: 'array',
      description: 'Up to five posts of this brand, in the order shown.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: {
            disableNew: true,
            filter: ({ document }) => ({
              filter: '$brand in brands',
              params: { brand: brandKeyOf(document?._id) },
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(5).unique(),
    }),
  ],
  preview: {
    select: { id: '_id', posts: 'posts' },
    prepare({ id, posts }: { id?: string; posts?: unknown }) {
      const key = brandKeyOf(id)
      const count = Array.isArray(posts) ? posts.length : 0

      return {
        title: `Most read — ${isEditorialBrandKey(key) ? BRANDS[key].title : key}`,
        subtitle: `${count} ${count === 1 ? 'post' : 'posts'}`,
        media: TrendUpwardIcon,
      }
    },
  },
})
