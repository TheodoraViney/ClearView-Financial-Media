import { OlistIcon } from '@sanity/icons/Olist'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText } from '../fields'

export const NUMBERED_LIST_ITEM_MAX = 4

/** A small heading over up to four numbered points (01, 02 …), each a title and a line of text. Numbers are automatic. */
export const numberedList = defineType({
  name: 'numberedList',
  title: 'Numbered list',
  type: 'object',
  icon: OlistIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    defineField({
      name: 'items',
      title: 'Points',
      type: 'array',
      description: 'Numbered automatically.',
      of: [
        defineArrayMember({
          name: 'numberedListItem',
          title: 'Point',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 2,
              validation: (Rule) => [
                Rule.required(),
                Rule.max(120).warning('Longer than 120 characters; the point will wrap onto more lines'),
              ],
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(NUMBERED_LIST_ITEM_MAX),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', items: 'items' },
    prepare({ adminLabel, heading, items }) {
      const count = Array.isArray(items) ? items.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Numbered list',
        subtitle: `Numbered list · ${count} ${count === 1 ? 'point' : 'points'}`,
      }
    },
  },
})
