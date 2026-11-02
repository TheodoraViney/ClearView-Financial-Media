import { LaunchIcon } from '@sanity/icons/Launch'
import {
  type ReferenceFilterResolver,
  type ValidationContext,
  defineArrayMember,
  defineField,
  defineType,
  getValueAtPath,
} from 'sanity'

import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

import { filterFor } from '../blocks/highlights'
import { pickedPostsCategoryRule, postsOfPageBrandInCategory } from '../blocks/post-list'
import { EXPLORE_CARD_ITEM_MAX, EXPLORE_CARD_SOURCES } from '../blocks/shared'
import { headingField, headingText, linkField } from '../fields'

export { EXPLORE_CARD_ITEM_MAX, EXPLORE_CARD_SOURCES }

/** Icons the site has for a card title. The site draws them; the list keys must match `ui/icons`. */
export const EXPLORE_CARD_ICONS = [
  { value: 'glasses', title: 'Glasses (features, analysis)' },
  { value: 'comment', title: 'Comment' },
  { value: 'star', title: 'Star (awards)' },
  { value: 'people-moves', title: 'People moves' },
  { value: 'public', title: 'Globe (events)' },
  { value: 'document', title: 'Document (research)' },
] as const

type Ref = { _ref?: string }

type CardValue = { source?: unknown; category?: Ref; count?: unknown }

const sourceOf = (value: unknown) => EXPLORE_CARD_SOURCES.find((source) => source.value === value)

const isPosts = (parent: unknown) => (parent as CardValue | undefined)?.source === 'posts'

/** The card's item count: its own count when valid, else the most. */
const cardCount = (card: CardValue | undefined) => {
  const count = card?.count

  return typeof count === 'number' && Number.isInteger(count) && count >= 1
    ? Math.min(count, EXPLORE_CARD_ITEM_MAX)
    : EXPLORE_CARD_ITEM_MAX
}

// An array member reference: parentPath ends at `items`, one level below the card.
const itemsOfCard: ReferenceFilterResolver = async (context) => {
  const card = getValueAtPath(context.document, context.parentPath.slice(0, -1)) as CardValue | undefined

  if (card?.source !== 'posts') {
    return { filter: filterFor(card?.source) }
  }

  const { filter, params } = await postsOfPageBrandInCategory(context)

  return { filter: filter ? `_type == "post" && (${filter})` : '_type == "post"', params }
}

type Picked = { _id: string; _type: string; title?: string; category?: string }

/** Picks of the card's source only; research reports in the Research category only. */
async function itemsOfSourceRule(items: Ref[] | undefined, context: ValidationContext): Promise<true | string> {
  const card = context.parent as CardValue | undefined
  const source = sourceOf(card?.source)
  const ids = (items ?? []).flatMap((ref) => (ref._ref ? [ref._ref] : []))

  if (!source || ids.length === 0) {
    return true
  }

  const max = cardCount(card)

  if ((items ?? []).length > max) {
    return `This card shows up to ${max} items; remove ${(items ?? []).length - max}`
  }

  const picked = await context
    .getClient({ apiVersion: '2026-09-01' })
    .fetch<Picked[]>('*[_id in $ids]{ _id, _type, title, "category": select(_type == "resource" => category) }', {
      ids,
    })

  for (const doc of picked) {
    const name = doc.title || doc._id

    if (doc._type !== source.type) {
      const docSource = EXPLORE_CARD_SOURCES.find((entry) => entry.type === doc._type)

      return `"${name}" is ${docSource?.title ?? doc._type}, but this card shows ${source.title}`
    }

    if (source.value === 'research' && doc.category !== 'research') {
      return `"${name}" is not in the Research category`
    }
  }

  return true
}

/**
 * One destination card of the Explore grid: heading with an icon, up to three items from one source and a
 * "View all" button. Posts come from one category; awards, events and research fill as the Highlights block does.
 * Picks come first and the page query fills the empty places.
 */
export const exploreCard = defineType({
  name: 'exploreCard',
  title: 'Explore card',
  type: 'object',
  icon: LaunchIcon,
  fields: [
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'string',
      description: 'Shown beside the heading.',
      options: { list: EXPLORE_CARD_ICONS.map(({ value, title }) => ({ value, title })) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Which records the card lists.',
      options: { list: EXPLORE_CARD_SOURCES.map(({ value, title }) => ({ value, title })), layout: 'radio' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      description: 'The posts this card lists: picks are limited to it, and its latest posts fill the empty places.',
      options: { disableNew: true },
      hidden: ({ parent }) => !isPosts(parent),
      validation: (Rule) =>
        Rule.custom((value: Ref | undefined, context) =>
          value?._ref || !isPosts(context.parent) ? true : 'Choose the category of the posts',
        ),
    }),
    defineField({
      name: 'count',
      title: 'Number of items',
      type: 'number',
      description: `How many items the card lists, 1 to ${EXPLORE_CARD_ITEM_MAX}. Leave empty for ${EXPLORE_CARD_ITEM_MAX}.`,
      validation: (Rule) => Rule.integer().min(1).max(EXPLORE_CARD_ITEM_MAX),
    }),
    defineField({
      name: 'items',
      title: 'Picks',
      type: 'array',
      // Lists what the site fills automatically right now, with Pin buttons.
      components: { input: AutoFillPicksInput },
      description: 'Up to the number of items above, in display order. Empty places fill automatically.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }, { type: 'awardsProgramme' }, { type: 'conferenceEvent' }, { type: 'resource' }],
          options: { filter: itemsOfCard, disableNew: true },
        }),
      ],
      validation: (Rule) => [
        Rule.unique().custom((items: Ref[] | undefined, context) => itemsOfSourceRule(items, context)),
        Rule.custom((items: Ref[] | undefined, context) =>
          isPosts(context.parent)
            ? pickedPostsCategoryRule((context.parent as CardValue).category?._ref, items, context)
            : true,
        ).warning(),
      ],
    }),
    defineField({
      name: 'deadlineLabel',
      title: 'Deadline label',
      type: 'string',
      description: 'Shown before the nominations deadline, e.g. "Entry deadline:". Leave empty to show the date only.',
      initialValue: 'Entry deadline:',
      hidden: ({ parent }) => (parent as CardValue | undefined)?.source !== 'awards',
    }),
    linkField({
      name: 'button',
      title: 'Button',
      description: 'The "View all …" button at the bottom of the card.',
      required: true,
      labelRequired: true,
    }),
  ],
  preview: {
    select: { heading: 'heading', source: 'source', category: 'category.title' },
    prepare({ heading, source, category }) {
      const match = sourceOf(source)

      return {
        title: headingText(heading) || 'Explore card',
        subtitle: match?.value === 'posts' ? `Posts · ${category ?? 'No category'}` : (match?.title ?? 'No source'),
      }
    },
  },
})
