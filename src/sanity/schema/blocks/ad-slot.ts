import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'

const AD_SLOT_SIZES = [
  { title: 'Leaderboard', value: 'leaderboard' },
  { title: 'Billboard', value: 'billboard' },
]

const AD_SLOT_SPACINGS = [
  { title: 'Around', value: 'around' },
  { title: 'Below', value: 'below' },
  { title: 'Below, section size', value: 'belowSection' },
  { title: 'None', value: 'none' },
]

/**
 * A reserved banner position. Reserves the design height so the ad never
 * shifts layout when it fills.
 *
 * TODO: Google Ad Manager ad unit path and sizes per position, read with the
 * brand's ad unit prefix, arrive with the GAM foundation ticket.
 */
export const adSlot = defineType({
  name: 'adSlot',
  title: 'Ad slot',
  type: 'object',
  icon: BlockElementIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      options: { list: AD_SLOT_SIZES, layout: 'radio', direction: 'horizontal' },
      initialValue: 'leaderboard',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Placeholder text',
      type: 'string',
      description: 'Shown inside the empty slot, for example "Banner Position 1 – Leaderboard (728x90)".',
    }),
    defineField({
      name: 'spacing',
      title: 'Spacing',
      type: 'string',
      description: 'Vertical space around the slot.',
      options: { list: AD_SLOT_SPACINGS, layout: 'radio', direction: 'horizontal' },
      initialValue: 'around',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', label: 'label', size: 'size' },
    prepare({ adminLabel, label, size }) {
      return {
        title: adminLabel || label || 'Ad slot',
        subtitle: ['Ad slot', size].filter(Boolean).join(' · '),
      }
    },
  },
})
