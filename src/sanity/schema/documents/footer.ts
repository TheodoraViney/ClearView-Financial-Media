import { InsertBelowIcon } from '@sanity/icons/InsertBelow'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'

/*
 * Site footer content, one document per brand with the fixed id
 * `footerDocumentId(key)` from `src/brands.ts`, opened from each brand folder
 * in the Studio. ClearView uses `clearviewFooter`, the three publications use
 * `publicationFooter` (`BRANDS[key].footerType`). Creating, duplicating and
 * deleting are disabled in `sanity.config.ts`. The logo stays in Brand
 * settings.
 */

const descriptionField = defineField({
  name: 'description',
  title: 'Description',
  type: 'text',
  rows: 3,
  validation: (Rule) => Rule.required(),
})

const columnsField = (max: number) =>
  defineField({
    name: 'columns',
    title: 'Link columns',
    type: 'array',
    of: [defineArrayMember({ type: 'footerColumn' })],
    validation: (Rule) => Rule.required().min(1).max(max),
  })

const socialHeadingField = defineField({
  name: 'socialHeading',
  title: 'Social heading',
  type: 'string',
  initialValue: 'Follow us',
  validation: (Rule) => Rule.required(),
})

const socialField = defineField({
  name: 'social',
  title: 'Social links',
  type: 'array',
  of: [defineArrayMember({ type: 'socialLink' })],
  validation: (Rule) =>
    Rule.required()
      .min(1)
      .max(6)
      .custom((items: { url?: string }[] | undefined) => {
        const urls = (items ?? []).map((item) => item.url).filter(Boolean)

        return new Set(urls).size === urls.length || 'Each address can appear only once.'
      }),
})

const copyrightField = defineField({
  name: 'copyright',
  title: 'Copyright',
  type: 'string',
  description: '{year} is replaced with the current year.',
  fieldset: 'bottomLine',
  initialValue: '© {year} ClearView Financial Media',
  validation: (Rule) => Rule.required(),
})

const cookieSettingsField = defineField({
  name: 'cookieSettingsLabel',
  title: 'Cookie settings link',
  type: 'string',
  fieldset: 'bottomLine',
  initialValue: 'Cookie settings',
  validation: (Rule) => Rule.required(),
})

// The copyright and, under it, the cookie settings link at the bottom of the footer, side by side in the Studio.
const bottomLineFieldset = { name: 'bottomLine', title: 'Bottom of the footer', options: { columns: 2 } }

const footerPreview = {
  select: { id: '_id', columns: 'columns' },
  prepare({ id, columns }: { id?: string; columns?: unknown }) {
    const key = String(id ?? '').replace(/^drafts\./, '').replace(/^footer-/, '')
    const count = Array.isArray(columns) ? columns.length : 0

    return {
      title: `Footer — ${isBrandKey(key) ? BRANDS[key].title : key}`,
      subtitle: `${count} ${count === 1 ? 'column' : 'columns'}`,
      media: InsertBelowIcon,
    }
  },
}

export const clearviewFooter = defineType({
  name: 'clearviewFooter',
  title: 'ClearView footer',
  type: 'document',
  icon: InsertBelowIcon,
  fieldsets: [bottomLineFieldset],
  fields: [descriptionField, columnsField(5), socialHeadingField, socialField, copyrightField, cookieSettingsField],
  preview: footerPreview,
})

export const publicationFooter = defineType({
  name: 'publicationFooter',
  title: 'Publication footer',
  type: 'document',
  icon: InsertBelowIcon,
  fieldsets: [bottomLineFieldset],
  fields: [
    descriptionField,
    defineField({
      name: 'publisherLine',
      title: 'Publisher line',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    columnsField(4),
    socialHeadingField,
    socialField,
    copyrightField,
    cookieSettingsField,
  ],
  preview: footerPreview,
})
