import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRAND_KEYS, BRANDS } from '@/brands'
import {
  CATEGORIES_INTRO_DEFAULT,
  CATEGORIES_LABEL_DEFAULTS,
  CATEGORIES_PAGE_SLUG,
  CATEGORIES_RELATED_HEADING_DEFAULT,
  type CategoriesLabels,
} from '@/lib/categories-copy'

import { pageBlocksField } from '../blocks'
import { headingField } from '../fields'

// The home page is the page with the slug "home". Its banners sit between three block lists; other pages have one.
const isHome = (document: unknown) =>
  (document as { slug?: { current?: string } } | undefined)?.slug?.current === 'home'
const notHome = ({ document }: { document?: unknown }) => !isHome(document)

// The Categories page (the articles list) is the page with the slug "categories", one per editorial brand with the
// fixed id `page-categories-{brand}`. Its layout is a template: copy fields instead of blocks.
const isCategories = (document: unknown) =>
  (document as { slug?: { current?: string } } | undefined)?.slug?.current === CATEGORIES_PAGE_SLUG
const notCategories = ({ document }: { document?: unknown }) => !isCategories(document)
const isFixedCategoriesPage = (document: unknown) =>
  /^(drafts\.)?page-categories-/.test(String((document as { _id?: string } | undefined)?._id ?? ''))

// The template fields start with the design copy on every new page, so they are required on the Categories page only.
const requiredOnCategories = (value: unknown, context: { document?: unknown }) =>
  !isCategories(context.document) || (typeof value === 'string' ? value.trim() !== '' : Boolean(value))
    ? true
    : 'Required'

const label = (name: keyof CategoriesLabels, title: string, description: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    initialValue: CATEGORIES_LABEL_DEFAULTS[name],
    validation: (Rule) => Rule.custom(requiredOnCategories),
  })

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      options: {
        list: BRAND_KEYS.map((key) => ({
          title: BRANDS[key].title,
          value: key,
        })),
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Fixed on the Categories page: the site serves it at /categories.',
      readOnly: ({ document }) => isFixedCategoriesPage(document),
      options: {
        source: 'title',
        isUnique: async (slug, context) => {
          const { document, getClient } = context
          const brand = document?.brand as string | undefined

          if (!brand) {
            return true
          }

          const client = getClient({ apiVersion: '2026-09-01' })
          const id = document?._id.replace(/^drafts\./, '')

          const params = {
            slug,
            brand,
            draft: `drafts.${id}`,
            published: id,
          }

          const query = `!defined(*[_type=="page" && slug.current==$slug && brand==$brand && !(_id in [$draft,$published])][0]._id)`

          return client.fetch(query, params)
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 3,
      description: 'Shown under the title.',
      hidden: notCategories,
      initialValue: CATEGORIES_INTRO_DEFAULT,
      validation: (Rule) => Rule.custom(requiredOnCategories),
    }),
    defineField({
      name: 'listLabels',
      title: 'Filter and list labels',
      type: 'object',
      hidden: notCategories,
      options: { collapsible: true, collapsed: true },
      fields: [
        label('topicsLabel', 'Topics filter label', 'Above the topics filter.'),
        label('allTopicsLabel', 'All topics option', 'Topics filter text when nothing is selected, and its first option.'),
        label('regionsLabel', 'Region filter label', 'Above the region filter.'),
        label('allRegionsLabel', 'All regions option', 'Region filter text when nothing is selected, and its first option.'),
        label('sortLabel', 'Sort label', 'Above the date sort.'),
        label('sortLatestLabel', 'Latest first option', 'Date sort option, the default.'),
        label('sortOldestLabel', 'Oldest first option', 'Date sort option.'),
        label('selectedLabel', 'Selected count suffix', 'Follows the number when two or more options are chosen, for example "3 selected".'),
        label('clearFiltersLabel', 'Clear filters button', 'In the open filter and in the empty state.'),
        label('emptyStateText', 'Empty state text', 'Shown when no article matches the filters.'),
        label('readArticleLabel', 'Read article link', 'On the featured story and on every card.'),
        label('previousLabel', 'Previous page button', 'Pagination.'),
        label('nextLabel', 'Next page button', 'Pagination.'),
      ],
    }),
    defineField({
      name: 'relatedTopics',
      title: 'Related topics',
      type: 'object',
      description: 'The list of links under the articles.',
      hidden: notCategories,
      fields: [
        headingField('heading', {
          defaultLevel: 'h2',
          initialText: CATEGORIES_RELATED_HEADING_DEFAULT,
          requiredWhen: ({ document }) => isCategories(document),
        }),
        defineField({
          name: 'items',
          title: 'Categories and topics',
          type: 'array',
          description: 'In this order. Drag to reorder.',
          of: [
            defineArrayMember({
              type: 'reference',
              to: [{ type: 'category' }, { type: 'topic' }],
              options: { disableNew: true },
            }),
          ],
          validation: (Rule) =>
            Rule.unique().custom((value: unknown[] | undefined, context) =>
              !isCategories(context.document) || (value?.length ?? 0) > 0 ? true : 'Add at least one category or topic',
            ),
        }),
      ],
    }),
    // `blocks` keeps its name on the home page too, so its blocks above Banner 3 needed no move.
    pageBlocksField('blocks', {
      title: 'Blocks',
      description: 'On the home page: the blocks above Banner 3. Banners are placed by the page template.',
      hidden: ({ document }) => isCategories(document),
    }),
    pageBlocksField('blocksMiddle', {
      title: 'Blocks between Banner 3 and Banner 4',
      description: 'Home page only. Leave empty to show no Banner 4.',
      hidden: notHome,
    }),
    pageBlocksField('blocksBottom', {
      title: 'Blocks below Banner 4',
      description: 'Home page only.',
      hidden: notHome,
    }),
  ],
})
