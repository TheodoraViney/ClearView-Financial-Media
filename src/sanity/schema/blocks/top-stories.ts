import { DocumentsIcon } from '@sanity/icons/Documents'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { adminLabelField } from '../fields'
import { postsOfPageBrand, TOP_STORIES_ARTICLE_COUNT, TOP_STORIES_SLIDE_COUNT, topStoriesSlideCount } from './shared'

export { postsOfPageBrand, TOP_STORIES_ARTICLE_COUNT, TOP_STORIES_SLIDE_COUNT, topStoriesSlideCount }

type PostRef = { _ref?: string }

const pageBrandOf = (document: unknown) => (document as { brand?: string } | undefined)?.brand

const postPicks = (
  name: string,
  title: string,
  max: number | ((brand: unknown) => number),
  other: string,
  description = `Up to ${typeof max === 'number' ? max : TOP_STORIES_SLIDE_COUNT}. Empty places fill with the latest posts.`,
) =>
  defineField({
    name,
    title,
    type: 'array',
    // Lists what the site fills automatically right now, with Pin buttons.
    components: { input: AutoFillPicksInput },
    description,
    of: [
      defineArrayMember({
        type: 'reference',
        to: [{ type: 'post' }],
        options: { filter: postsOfPageBrand, disableNew: true },
      }),
    ],
    validation: (Rule) =>
      Rule.unique()
        .custom((picks, context) => {
          const limit = typeof max === 'number' ? max : max(pageBrandOf(context.document))
          const count = (picks as PostRef[] | undefined)?.length ?? 0

          if (count > limit) {
            return limit === 1 ? 'Publication homes show one lead story' : `Up to ${limit}; remove ${count - limit}`
          }

          const others = (context.parent as Record<string, PostRef[] | undefined>)?.[other] ?? []
          const otherIds = new Set(others.map((ref) => ref._ref))
          const clash = (picks as PostRef[] | undefined)?.some((ref) => otherIds.has(ref._ref))

          return clash ? 'A post can appear in the slides or the articles, not both' : true
        }),
  })

/**
 * Lead stories with three smaller articles beneath them. ClearView runs up to
 * three lead stories as a slider; a publication home shows one, with a label
 * above the articles. Picks come first; the page query fills the remaining
 * places with the latest posts of the brand.
 */
export const topStories = defineType({
  name: 'topStories',
  title: 'Top stories',
  type: 'object',
  icon: DocumentsIcon,
  fields: [
    adminLabelField,
    postPicks(
      'slides',
      'Slides',
      topStoriesSlideCount,
      'articles',
      `The lead story. ClearView: up to ${TOP_STORIES_SLIDE_COUNT}, shown as a slider. Publication homes: one. Empty places fill with the latest posts.`,
    ),
    // Publication homes only: the ClearView home has no label above its articles.
    defineField({
      name: 'label',
      title: 'Articles label',
      type: 'string',
      description: 'Shown above the articles below the lead story.',
      initialValue: 'Top Stories',
      hidden: ({ document }) => pageBrandOf(document) === 'clearview',
      validation: (Rule) =>
        Rule.custom((value: string | undefined, context) =>
          pageBrandOf(context.document) === 'clearview' || value?.trim() ? true : 'Required',
        ),
    }),
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
