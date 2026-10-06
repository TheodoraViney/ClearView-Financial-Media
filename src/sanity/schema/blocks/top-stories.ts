import { DocumentsIcon } from '@sanity/icons/Documents'
import { defineArrayMember, defineField, defineType, type ReferenceFilterResolver } from 'sanity'

import { adminLabelField } from '../fields'

export const TOP_STORIES_SLIDE_COUNT = 3
export const TOP_STORIES_ARTICLE_COUNT = 3

type PostRef = { _ref?: string }

// ClearView posts never carry the clearview key: the group page draws on every editorial brand.
export const postsOfPageBrand: ReferenceFilterResolver = ({ document }) => {
  const brand = (document as { brand?: string }).brand

  if (!brand || brand === 'clearview') {
    return {}
  }

  return { filter: '$brand in brands', params: { brand } }
}

const postPicks = (name: string, title: string, max: number, other: string) =>
  defineField({
    name,
    title,
    type: 'array',
    description: `Up to ${max}. Empty places fill with the latest posts.`,
    of: [
      defineArrayMember({
        type: 'reference',
        to: [{ type: 'post' }],
        options: { filter: postsOfPageBrand, disableNew: true },
      }),
    ],
    validation: (Rule) =>
      Rule.max(max)
        .unique()
        .custom((picks, context) => {
          const others = (context.parent as Record<string, PostRef[] | undefined>)?.[other] ?? []
          const otherIds = new Set(others.map((ref) => ref._ref))
          const clash = (picks as PostRef[] | undefined)?.some((ref) => otherIds.has(ref._ref))

          return clash ? 'A post can appear in the slides or the articles, not both' : true
        }),
  })

/**
 * Hero slider with three smaller articles beneath it. Picks come first; the
 * page query fills the remaining places with the latest posts of the brand.
 */
export const topStories = defineType({
  name: 'topStories',
  title: 'Top stories',
  type: 'object',
  icon: DocumentsIcon,
  fields: [
    adminLabelField,
    postPicks('slides', 'Slides', TOP_STORIES_SLIDE_COUNT, 'articles'),
    postPicks('articles', 'Articles below', TOP_STORIES_ARTICLE_COUNT, 'slides'),
    defineField({
      name: 'linkLabel',
      title: 'Link label',
      type: 'string',
      description: 'The link text on each slide.',
      initialValue: 'Read article',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', slides: 'slides', articles: 'articles' },
    prepare({ adminLabel, slides, articles }) {
      const count = (picks: unknown) => (Array.isArray(picks) ? picks.length : 0)

      return {
        title: adminLabel || 'Top stories',
        subtitle: `Picked: ${count(slides)} slides · ${count(articles)} articles, the rest fill with the latest`,
      }
    },
  },
})
