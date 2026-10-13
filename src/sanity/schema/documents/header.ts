import { MenuIcon } from '@sanity/icons/Menu'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'
import { SEARCH_LABEL_DEFAULTS } from '@/lib/search-term'

import { linkField } from '../fields'

/*
 * Site header content, one document per brand with the fixed id
 * `headerDocumentId(key)` from `src/brands.ts`, opened from each brand folder
 * in the Studio. ClearView uses `clearviewHeader`, the three publications use
 * `publicationHeader` (`BRANDS[key].headerType`). Creating, duplicating and
 * deleting are disabled in `sanity.config.ts`. Logos and colours stay in
 * Brand settings.
 */

const searchPlaceholderField = defineField({
  name: 'searchPlaceholder',
  title: 'Search placeholder',
  type: 'string',
  description: 'Hint text inside the search field.',
  validation: (Rule) => Rule.required(),
})

const searchLabel = (name: string, title: string, initialValue: string, description: string) =>
  defineField({ name, title, type: 'string', initialValue, description, validation: (Rule) => Rule.required() })

/** Visible copy of the suggestions popup under the search field. */
const searchLabelsField = defineField({
    name: 'searchLabels',
    title: 'Search suggestions',
    type: 'object',
    description: 'Headings and empty state of the suggestions shown while typing in the search field.',
    options: { collapsible: true, collapsed: true },
    validation: (Rule) => Rule.required(),
    fields: [
      searchLabel('articles', 'Articles heading', SEARCH_LABEL_DEFAULTS.articles, 'Heading above matching articles.'),
      searchLabel('events', 'Events heading', SEARCH_LABEL_DEFAULTS.events, 'Heading above matching events.'),
      searchLabel('awards', 'Awards heading', SEARCH_LABEL_DEFAULTS.awards, 'Heading above matching awards.'),
      searchLabel('resources', 'Resources heading', SEARCH_LABEL_DEFAULTS.resources, 'Heading above matching resources.'),
      searchLabel('nothingFound', 'Nothing found', SEARCH_LABEL_DEFAULTS.nothingFound, 'Shown when nothing matches the search.'),
    ],
  })

const headerPreview = {
  select: { id: '_id', navigation: 'navigation' },
  prepare({ id, navigation }: { id?: string; navigation?: unknown }) {
    const key = String(id ?? '').replace(/^drafts\./, '').replace(/^header-/, '')
    const count = Array.isArray(navigation) ? navigation.length : 0

    return {
      title: `Header — ${isBrandKey(key) ? BRANDS[key].title : key}`,
      subtitle: `${count} ${count === 1 ? 'menu item' : 'menu items'}`,
      media: MenuIcon,
    }
  },
}

export const clearviewHeader = defineType({
  name: 'clearviewHeader',
  title: 'ClearView header',
  type: 'document',
  icon: MenuIcon,
  fields: [
    defineField({
      name: 'navigation',
      title: 'Navigation',
      type: 'array',
      description: 'Menu items in order. A dropdown groups several links under one label.',
      of: [defineArrayMember({ type: 'navLink' }), defineArrayMember({ type: 'navGroup' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    searchPlaceholderField,
    searchLabelsField,
  ],
  preview: headerPreview,
})

export const publicationHeader = defineType({
  name: 'publicationHeader',
  title: 'Publication header',
  type: 'document',
  icon: MenuIcon,
  fields: [
    defineField({
      name: 'navigation',
      title: 'Navigation',
      type: 'array',
      description: 'Menu items in order.',
      of: [defineArrayMember({ type: 'navLink' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    searchPlaceholderField,
    searchLabelsField,
    linkField({
      name: 'subscribe',
      title: 'Subscribe button',
      required: true,
      labelRequired: true,
    }),
  ],
  preview: headerPreview,
})
