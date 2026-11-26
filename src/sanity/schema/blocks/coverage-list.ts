import { UlistIcon } from '@sanity/icons/Ulist'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { COVERAGE_LIST_ICONS } from '@/lib/coverage-list'

import { adminLabelField, headingField, headingText } from '../fields'
import { paragraphsField, paragraphValue } from '../objects/rich-text'

export const COVERAGE_LIST_ITEM_MAX = 8

const iconTitle = (value: unknown) => COVERAGE_LIST_ICONS.find((icon) => icon.value === value)?.title

const item = (key: string, icon: string, title: string, description: string) => ({
  _key: key,
  _type: 'coverageListItem',
  icon,
  title,
  description: paragraphValue(description),
})

/** An intro (heading and text) beside a headed list of topics, each an icon, a title and a line of text. */
export const coverageList = defineType({
  name: 'coverageList',
  title: 'Coverage list',
  type: 'object',
  icon: UlistIcon,
  fields: [
    adminLabelField,
    headingField('heading', {
      title: 'Heading',
      defaultLevel: 'h2',
      initialText: 'A global view of wealth management',
      required: true,
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 3,
      initialValue:
        'Through WealthBriefing, WealthBriefingAsia and Family Wealth Report, ClearView covers the key decisions and developments in private banking and wealth management.',
      validation: (Rule) => Rule.required(),
    }),
    headingField('listHeading', {
      title: 'List heading',
      defaultLevel: 'h3',
      initialText: 'Coverage includes',
      required: true,
    }),
    defineField({
      name: 'items',
      title: 'Topics',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'coverageListItem',
          title: 'Topic',
          type: 'object',
          fieldsets: [{ name: 'iconTitle', title: 'Icon and title', options: { columns: 2 } }],
          fields: [
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              fieldset: 'iconTitle',
              options: { list: COVERAGE_LIST_ICONS.map(({ value, title }) => ({ value, title })), layout: 'dropdown' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              fieldset: 'iconTitle',
              validation: (Rule) => Rule.required(),
            }),
            paragraphsField({
              name: 'description',
              title: 'Description',
              maxLength: 160,
              lengthWarning: 'Longer than 160 characters; the topic will wrap onto more lines',
            }),
          ],
          preview: {
            select: { title: 'title', icon: 'icon' },
            prepare({ title, icon }) {
              return { title: title || 'Empty topic', subtitle: iconTitle(icon) ?? 'No icon' }
            },
          },
        }),
      ],
      initialValue: [
        item(
          'strategy',
          'pie-chart',
          'Strategy and business change',
          'Strategic and structural developments, business models, results and performance, mergers and acquisitions.',
        ),
        item(
          'technology',
          'cpu-chip',
          'Technology and operations',
          'Digital delivery, technology, cybersecurity and data management.',
        ),
        item('people', 'user', 'People and private wealth', 'Client expectations, people moves, families and family offices.'),
        item(
          'investment',
          'bar-chart',
          'Investment and regulation',
          'Asset management and allocation, products, compliance, AML, KYC, suitability, tax, estate planning and legal issues.',
        ),
      ],
      validation: (Rule) => Rule.required().min(1).max(COVERAGE_LIST_ITEM_MAX),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', items: 'items' },
    prepare({ adminLabel, heading, items }) {
      const count = Array.isArray(items) ? items.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Coverage list',
        subtitle: `Coverage list · ${count} ${count === 1 ? 'topic' : 'topics'}`,
      }
    },
  },
})
