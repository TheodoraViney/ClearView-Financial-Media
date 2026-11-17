import { ThListIcon } from '@sanity/icons/ThList'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText } from '../fields'

export const BENEFIT_PANEL_ITEM_MAX = 4

/** A panel over a background photo: heading and up to four short benefits, each a title and a line of text. */
export const benefitPanel = defineType({
  name: 'benefitPanel',
  title: 'Benefit panel',
  type: 'object',
  icon: ThListIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    // Decorative (rendered with alt=""), so a plain image without the alt-text rule of imageField.
    defineField({
      name: 'image',
      title: 'Background image',
      type: 'image',
      description: 'Decorative, behind the white text; choose a photo dark enough for the text to stay readable.',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Benefits',
      type: 'array',
      description: `Up to ${BENEFIT_PANEL_ITEM_MAX}, in display order.`,
      of: [
        defineArrayMember({
          name: 'benefitPanelItem',
          title: 'Benefit',
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
                Rule.max(120).warning('Longer than 120 characters; the benefit will wrap onto more lines'),
              ],
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(BENEFIT_PANEL_ITEM_MAX),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', items: 'items', media: 'image' },
    prepare({ adminLabel, heading, items, media }) {
      const count = Array.isArray(items) ? items.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Benefit panel',
        subtitle: `Benefit panel · ${count} ${count === 1 ? 'benefit' : 'benefits'}`,
        media,
      }
    },
  },
})
