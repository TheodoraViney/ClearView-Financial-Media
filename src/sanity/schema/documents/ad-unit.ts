import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { AD_UNIT_SIZES, isAdUnitCode } from '@/lib/gam'

/*
 * A Google Ad Manager ad unit, as set up in the Publisher's GAM account. One shared list for the whole group: ad
 * slots and the article page pick from it. Creating or changing the unit in GAM itself stays with the Publisher;
 * this document only names it for the site.
 */
export const adUnit = defineType({
  name: 'adUnit',
  title: 'Ad unit',
  type: 'document',
  icon: BlockElementIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description: 'How the unit appears in the pickers, for example "WB Leaderboard, all pages".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'code',
      title: 'Ad unit code',
      type: 'string',
      description:
        'The Code column in Google Ad Manager, Inventory → Ad units, for example WB_Leaderboard_ROS. Not the Name column.',
      validation: (Rule) =>
        Rule.required().custom((value: string | undefined) =>
          !value || isAdUnitCode(value) ? true : 'Letters, digits, _ . and - only, as in Google Ad Manager',
        ),
    }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      description: 'The size the unit has in Google Ad Manager. It decides which banner positions can use the unit.',
      options: {
        list: AD_UNIT_SIZES.map((size) => ({ title: size.replace('x', ' × '), value: size })),
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', code: 'code', size: 'size' },
    prepare({ title, code, size }) {
      return { title: title || code || 'Ad unit', subtitle: [code, size].filter(Boolean).join(' · ') }
    },
  },
})
