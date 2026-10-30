import { TrendUpwardIcon } from '@sanity/icons/TrendUpward'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isEditorialBrandKey } from '@/brands'
import { MOST_READ_COUNT, MOST_READ_TITLE_DEFAULT } from '@/lib/article-copy'

/*
 * The "Most read" list in the article and articles-list sidebars, one
 * document per editorial brand with the fixed id `mostReadDocumentId(key)`
 * from `src/brands.ts`, opened from each brand folder in the Studio. Kept out
 * of Brand settings: that document feeds every page of the brand, so editing
 * the list there would expire them all.
 *
 * Always shown: the editor's picks come first, in their order, and the places they leave empty are filled with the
 * brand's latest posts (`mostReadAutoFill` in `src/sanity/most-read.ts`). A measured source may replace "latest" later.
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
      initialValue: MOST_READ_TITLE_DEFAULT,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'posts',
      title: 'Posts',
      type: 'array',
      description:
        'Optional. Up to five posts of this brand, shown first in this order. Empty places fill automatically with the latest articles.',
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
      validation: (Rule) => Rule.max(MOST_READ_COUNT).unique(),
    }),
  ],
  preview: {
    select: { id: '_id', posts: 'posts' },
    prepare({ id, posts }: { id?: string; posts?: unknown }) {
      const key = brandKeyOf(id)
      const count = Array.isArray(posts) ? posts.length : 0

      return {
        title: `Most read — ${isEditorialBrandKey(key) ? BRANDS[key].title : key}`,
        subtitle: count > 0 ? `${count} ${count === 1 ? 'post' : 'posts'}, then the latest` : 'Latest posts',
        media: TrendUpwardIcon,
      }
    },
  },
})
