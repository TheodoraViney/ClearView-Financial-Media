import { DocumentsIcon } from '@sanity/icons/Documents'
import { UlistIcon } from '@sanity/icons/Ulist'
import {
  type FieldDefinition,
  type Path,
  type ReferenceFilterResolver,
  type ValidationContext,
  defineArrayMember,
  defineField,
  defineType,
  getValueAtPath,
} from 'sanity'

import { categoryDocumentId } from '@/lib/article-taxonomy'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { adminLabelField, headingField, headingText, linkField } from '../fields'
import { POST_BRIEFS_MAX, POST_CARDS_COUNT, postsOfPageBrand } from './shared'

export { POST_BRIEFS_MAX, POST_CARDS_COUNT }

type Ref = { _ref?: string }

/** The category reference of the block (or card) one level above the array at `path`. */
const blockCategoryAt = (document: unknown, path: Path): string | undefined =>
  (getValueAtPath(document, path.slice(0, -1)) as { category?: Ref } | undefined)?.category?._ref

/**
 * The page brand's posts (every editorial brand on ClearView) in the block's category. An array member reference:
 * parentPath ends at the picks array, one level below the block. No category yet: the brand rule only.
 */
export const postsOfPageBrandInCategory: ReferenceFilterResolver = async (context) => {
  const { filter, params } = await postsOfPageBrand(context)
  const category = blockCategoryAt(context.document, context.parentPath)

  if (!category) {
    return { filter, params }
  }

  return {
    filter: filter ? `(${filter}) && category._ref == $category` : 'category._ref == $category',
    params: { ...params, category },
  }
}

type PickedPost = { _id: string; title?: string; category?: string }

/**
 * Picked posts in the block's category. A pick whose category changed after it was picked (or written past the
 * filter) gets a warning, not an error: the post still shows, just not where the editor may expect.
 */
export async function pickedPostsCategoryRule(
  category: string | undefined,
  picks: Ref[] | undefined,
  context: ValidationContext,
): Promise<true | string> {
  const ids = (picks ?? []).flatMap((ref) => (ref._ref ? [ref._ref] : []))

  if (!category || ids.length === 0) {
    return true
  }

  const posts = await context
    .getClient({ apiVersion: '2026-09-01' })
    .fetch<PickedPost[]>('*[_id in $ids]{ _id, title, "category": category._ref }', { ids })
  const other = posts.find((post) => post.category !== category)

  return other ? `"${other.title || other._id}" is in another category than this block` : true
}

/**
 * The fields shared by News Analysis and News in Brief: heading, "View all" link, the source category (News Analysis
 * only) and the picks. Picks come first; the page query fills the empty places with the brand's latest posts, of the
 * category when the block has one. News in Brief takes any post of the brand.
 */
const postListFields = (options: {
  heading: string
  link: { external: string; label: string }
  /** The source category's slug; without it the block takes any post of the brand. */
  category?: string
  /** The most picks, or a function of the block for a count field. */
  max: number | ((parent: Record<string, unknown> | undefined) => number)
  extra?: FieldDefinition[]
}): FieldDefinition[] => {
  const { category, max } = options
  const source = category ? 'the latest posts of the category' : 'the latest posts of the brand'
  const maxOf = (parent: unknown) =>
    typeof max === 'number' ? max : max(parent as Record<string, unknown> | undefined)

  return [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: options.heading, required: true }),
    defineField({
      ...linkField({ required: true, labelRequired: true, description: 'The "View all" link beside the heading.' }),
      initialValue: { kind: 'external', ...options.link },
    }),
    ...(category
      ? [
          defineField({
            name: 'category',
            title: 'Category',
            type: 'reference',
            to: [{ type: 'category' }],
            description:
              'The posts this block shows: picks are limited to it, and the latest posts of it fill the empty places.',
            options: { disableNew: true },
            initialValue: { _ref: categoryDocumentId(category) },
            validation: (Rule) => Rule.required(),
          }),
        ]
      : []),
    ...(options.extra ?? []),
    defineField({
      name: 'posts',
      title: 'Picks',
      type: 'array',
      // Lists what the site fills automatically right now, with Pin buttons.
      components: { input: AutoFillPicksInput },
      description:
        typeof max === 'number'
          ? `Up to ${max}, in display order. Empty places fill with ${source}.`
          : `Up to the number of rows above, in display order. Empty places fill with ${source}.`,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: { filter: category ? postsOfPageBrandInCategory : postsOfPageBrand, disableNew: true },
        }),
      ],
      validation: (Rule) => [
        Rule.unique().custom((picks: Ref[] | undefined, context) => {
          const limit = maxOf(context.parent)
          const count = picks?.length ?? 0

          return count > limit ? `Up to ${limit}; remove ${count - limit}` : true
        }),
        ...(category
          ? [
              Rule.custom((picks: Ref[] | undefined, context) =>
                pickedPostsCategoryRule((context.parent as { category?: Ref } | undefined)?.category?._ref, picks, context),
              ).warning(),
            ]
          : []),
      ],
    }),
  ]
}

/** `withCategory`: the block has a source category (News Analysis), shown in the subtitle. */
const postListPreview = (fallback: string, withCategory: boolean) => ({
  select: { adminLabel: 'adminLabel', heading: 'heading', category: 'category.title', posts: 'posts' },
  prepare({
    adminLabel,
    heading,
    category,
    posts,
  }: {
    adminLabel?: string
    heading?: unknown
    category?: string
    posts?: unknown
  }) {
    const count = Array.isArray(posts) ? posts.length : 0

    return {
      title: adminLabel || headingText(heading) || fallback,
      subtitle: [headingText(heading) ?? fallback, withCategory ? (category ?? 'No category') : 'Any category', `${count} ${count === 1 ? 'pick' : 'picks'}, then latest`].join(
        ' · ',
      ),
    }
  },
})

/** News Analysis: three post cards (category, date, title, standfirst) from one category. */
export const postCards = defineType({
  name: 'postCards',
  title: 'Post cards',
  type: 'object',
  icon: DocumentsIcon,
  fields: postListFields({
    heading: 'News Analysis',
    link: { external: '/articles?category=comment-and-analysis', label: 'View all news analysis' },
    category: 'comment-and-analysis',
    max: POST_CARDS_COUNT,
  }),
  preview: postListPreview('Post cards', true),
})

const briefCount = (parent: Record<string, unknown> | undefined) => {
  const count = parent?.count

  return typeof count === 'number' && Number.isInteger(count) && count >= 1 ? Math.min(count, POST_BRIEFS_MAX) : POST_BRIEFS_MAX
}

/** News in Brief: rows of title, topic, date and the post's brief text, from any post of the brand. */
export const postBriefs = defineType({
  name: 'postBriefs',
  title: 'Post briefs',
  type: 'object',
  icon: UlistIcon,
  fields: postListFields({
    heading: 'News in Brief',
    link: { external: '/articles', label: 'View all news' },
    max: briefCount,
    extra: [
      defineField({
        name: 'count',
        title: 'Number of rows',
        type: 'number',
        description: `How many posts the block shows, 1 to ${POST_BRIEFS_MAX}.`,
        initialValue: POST_BRIEFS_MAX,
        validation: (Rule) => Rule.required().integer().min(1).max(POST_BRIEFS_MAX),
      }),
    ],
  }),
  preview: postListPreview('Post briefs', false),
})
