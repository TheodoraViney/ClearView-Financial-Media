import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineType } from 'sanity'

import { adminLabelField } from '../fields'

/**
 * The in-content banner position (728×90) inside an article. The editor only
 * chooses where it goes; the ad unit is the brand's, set once in the Article
 * page document. Sanity needs at least one field on an object, so it carries
 * the CMS-only label.
 */
export const adBreak = defineType({
  name: 'adBreak',
  title: 'Advertisement',
  type: 'object',
  icon: BlockElementIcon,
  fields: [adminLabelField],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Advertisement (in-content)', subtitle: 'Banner, 728×90', media: BlockElementIcon }
    },
  },
})
