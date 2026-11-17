import { TrendUpwardIcon } from '@sanity/icons/TrendUpward'
import { defineType } from 'sanity'

import { isEditorialBrandKey } from '@/brands'

import { adminLabelField } from '../fields'

/**
 * The brand's Most read list in a Two columns sidebar, as on the article page: its title and posts come from the
 * brand's Most read document, filled with the latest posts; the block loads them itself, on any page. Posts belong to
 * WealthBriefing, WealthBriefingAsia and Family Wealth Report only: on a ClearView page it would render nothing.
 */
export const mostReadSidebar = defineType({
  name: 'mostReadSidebar',
  title: 'Most read',
  type: 'object',
  icon: TrendUpwardIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) => {
      const brand = (context.document as { brand?: unknown } | undefined)?.brand

      return typeof brand !== 'string' || isEditorialBrandKey(brand)
        ? true
        : 'Most read lists posts, and ClearView has none: this block shows nothing on a ClearView page'
    }),
  fields: [adminLabelField],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return {
        title: adminLabel || 'Most read',
        subtitle: 'From the Most read document of the brand',
        media: TrendUpwardIcon,
      }
    },
  },
})
