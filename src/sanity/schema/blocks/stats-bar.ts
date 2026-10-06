import { BarChartIcon } from '@sanity/icons/BarChart'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { STATS_BAR_ICONS } from '@/lib/stats-bar'

import { adminLabelField, headingField, headingText } from '../fields'

export const STATS_BAR_ITEM_MAX = 6

const iconTitle = (value: unknown) => STATS_BAR_ICONS.find((icon) => icon.value === value)?.title

/** Heading and up to six editorial figures, each an icon, a short value and a label. Not counted from data. */
export const statsBar = defineType({
  name: 'statsBar',
  title: 'Stats bar',
  type: 'object',
  icon: BarChartIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    defineField({
      name: 'items',
      title: 'Stats',
      type: 'array',
      description: 'Up to six figures, in display order.',
      of: [
        defineArrayMember({
          name: 'statsItem',
          title: 'Stat',
          type: 'object',
          fields: [
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: STATS_BAR_ICONS.map(({ value, title }) => ({ value, title })),
                layout: 'dropdown',
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'The figure, e.g. "250k+".',
              validation: (Rule) => [
                Rule.required(),
                Rule.max(8).warning('Short figures read best, e.g. 250k+'),
              ],
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'What the figure counts, e.g. "Monthly readers".',
              validation: (Rule) => [
                Rule.required(),
                Rule.max(40).warning('Longer than 40 characters; the label will wrap onto more lines'),
              ],
            }),
          ],
          preview: {
            select: { value: 'value', label: 'label', icon: 'icon' },
            prepare({ value, label, icon }) {
              return {
                title: [value, label].filter(Boolean).join(' ') || 'Empty stat',
                subtitle: iconTitle(icon) ?? 'No icon',
              }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(STATS_BAR_ITEM_MAX),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', items: 'items' },
    prepare({ adminLabel, heading, items }) {
      const count = Array.isArray(items) ? items.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Stats bar',
        subtitle: `${count} ${count === 1 ? 'stat' : 'stats'}`,
      }
    },
  },
})
