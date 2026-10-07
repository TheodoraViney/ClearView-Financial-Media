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
  description: 'Short text under the logo.',
  validation: (Rule) => Rule.required(),
})

const columnsField = (max: number) =>
  defineField({
    name: 'columns',
    title: 'Link columns',
    type: 'array',
    description: `Link columns in order, up to ${max}.`,
    of: [defineArrayMember({ type: 'footerColumn' })],
    validation: (Rule) => Rule.required().min(1).max(max),
  })

const socialHeadingField = defineField({
  name: 'socialHeading',
  title: 'Social heading',
  type: 'string',
  description: 'Text above the social icons.',
  initialValue: 'Follow us',
  validation: (Rule) => Rule.required(),
})

const socialField = defineField({
  name: 'social',
  title: 'Social links',
  type: 'array',
  description: 'Icons in order. Each platform once.',
  of: [defineArrayMember({ type: 'socialLink' })],
  validation: (Rule) =>
    Rule.required()
      .min(1)
      .max(3)
      .custom((items: { platform?: string }[] | undefined) => {
        const platforms = (items ?? []).map((item) => item.platform).filter(Boolean)

        return new Set(platforms).size === platforms.length || 'Each platform can appear only once.'
      }),
})

const copyrightField = defineField({
  name: 'copyright',
  title: 'Copyright',
  type: 'string',
  description: '{year} is replaced with the current year on the site, e.g. "© {year} ClearView Financial Media".',
  initialValue: '© {year} ClearView Financial Media',
  validation: (Rule) => Rule.required(),
})

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
  fields: [descriptionField, columnsField(5), socialHeadingField, socialField, copyrightField],
  preview: footerPreview,
})

export const publicationFooter = defineType({
  name: 'publicationFooter',
  title: 'Publication footer',
  type: 'document',
  icon: InsertBelowIcon,
  fields: [
    descriptionField,
    defineField({
      name: 'publisherLine',
      title: 'Publisher line',
      type: 'string',
      description: 'Line under the description, e.g. "A ClearView Financial Media publication".',
      validation: (Rule) => Rule.required(),
    }),
    columnsField(4),
    socialHeadingField,
    socialField,
    copyrightField,
  ],
  preview: footerPreview,
})
