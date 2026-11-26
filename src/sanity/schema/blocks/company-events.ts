import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'
import {
  label,
  onCompanyEngagementPage,
  PAGE_ONLY_MESSAGE,
  paginationLabels,
  sectionHeading,
  sectionIntro,
} from './company-engagement-fields'

/**
 * The Company Engagement page's "Forum and summit partners": one card per conference event and company (sponsors and
 * technology demonstrators), newest event first. The cards come from the events; while there are none, a panel shows
 * in their place.
 */
export const companyEvents = defineType({
  name: 'companyEvents',
  title: 'Forum and summit partners',
  type: 'object',
  icon: CalendarIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) => (onCompanyEngagementPage(context.document) ? true : PAGE_ONLY_MESSAGE)),
  fieldsets: [
    { name: 'cards', title: 'Cards', options: { collapsible: true, collapsed: true, columns: 2 } },
    {
      name: 'empty',
      title: 'No partners',
      description: 'Shown in place of the cards while no event names a partner.',
      options: { collapsible: true, collapsed: true },
    },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    sectionHeading('Forum and summit partners'),
    sectionIntro(),
    label('sponsorLabel', 'Sponsor tag', undefined, 'Sponsor', 'cards'),
    label('techDemoLabel', 'Technology demo tag', undefined, 'Technology demo', 'cards'),
    label('metaLabel', 'Card type label', 'The year is added after it.', 'Event', 'cards'),
    label('ctaLabel', 'Card link', undefined, 'View event', 'cards'),
    defineField({
      name: 'emptyBadges',
      title: 'Panel tags',
      type: 'array',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
      initialValue: ['Summits', 'Briefings'],
      fieldset: 'empty',
    }),
    defineField({
      name: 'emptyText',
      title: 'Panel message',
      type: 'text',
      rows: 3,
      initialValue: 'Verified forum and summit partner records will appear here as shared company records are published.',
      fieldset: 'empty',
      validation: (Rule) => Rule.required(),
    }),
    ...paginationLabels('pagination'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      const text = Array.isArray(heading) ? heading[0]?.children?.[0]?.text : undefined

      return { title: adminLabel || text || 'Forum and summit partners', subtitle: 'Company Engagement page', media: CalendarIcon }
    },
  },
})
