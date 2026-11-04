import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { adUnitField, adminLabelField } from '../fields'

const AD_SLOT_SIZES = [
  { title: 'Leaderboard', value: 'leaderboard' },
  { title: 'Billboard', value: 'billboard' },
  { title: 'MPU (300×250)', value: 'mpu' },
]

const AD_SLOT_SPACINGS = [
  { title: 'Around', value: 'around' },
  { title: 'Below', value: 'below' },
  { title: 'Below, section size', value: 'belowSection' },
  { title: 'Sidebar', value: 'aside' },
  { title: 'Above only (publication Banner 1)', value: 'top' },
  { title: 'Rule above (publication Banner 3)', value: 'divided' },
  { title: 'None', value: 'none' },
]

/**
 * A reserved banner position. Reserves the design height so the ad never
 * shifts layout when it fills. The Size is the design's; the ad unit is picked
 * from the shared Ad units list and must match it.
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
    adUnitField({
      description: 'The Google Ad Manager unit this slot shows. Only units that fit the Size are listed.',
      position: (parent) => (parent as { size?: string } | undefined)?.size,
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
    select: { adminLabel: 'adminLabel', label: 'label', size: 'size', unit: 'unit.code' },
    prepare({ adminLabel, label, size, unit }) {
      return {
        title: adminLabel || label || 'Ad slot',
        subtitle: ['Ad slot', size, unit].filter(Boolean).join(' · '),
      }
    },
  },
})
