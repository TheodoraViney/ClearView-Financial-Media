import { MenuIcon } from '@sanity/icons/Menu'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'

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
    linkField({
      name: 'subscribe',
      title: 'Subscribe button',
      required: true,
      labelRequired: true,
    }),
  ],
  preview: headerPreview,
})
