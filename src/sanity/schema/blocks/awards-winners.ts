import { StarIcon } from '@sanity/icons/Star'
import { defineType } from 'sanity'

import { adminLabelField, headingField, headingText } from '../fields'

/**
 * The sidebar's Awards Winners section, an advertising block: a heading over the Awards Winners MPU. The banner's unit
 * is the brand's, set in Brand settings → Advertising; without one the block is hidden on the live site.
 */
export const awardsWinners = defineType({
  name: 'awardsWinners',
  title: 'Awards Winners (ad block)',
  type: 'object',
  icon: StarIcon,
  description:
    'Advertising block: a heading over the Awards Winners banner (MPU, 300 × 250). The ad unit is set in Brand settings → Advertising; while it is empty, the block is hidden on the live site.',
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Awards Winners', required: true }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      return {
        title: adminLabel || headingText(heading) || 'Awards Winners',
        subtitle: 'Ad block · Awards Winners MPU, 300 × 250',
      }
    },
  },
})
