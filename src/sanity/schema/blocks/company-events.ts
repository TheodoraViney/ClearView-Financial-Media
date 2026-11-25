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
    { name: 'cards', title: 'Cards', options: { collapsible: true, collapsed: true } },
    { name: 'empty', title: 'No partners', options: { collapsible: true, collapsed: true } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    sectionHeading('Forum and summit partners', 'Above the cards, or the panel while no event names a partner.'),
    sectionIntro(),
    label('sponsorLabel', 'Sponsor tag', 'Tag on a card when the company sponsored the event.', 'Sponsor', 'cards'),
    label('techDemoLabel', 'Technology demo tag', 'Tag on a card when the company gave a technology demonstration.', 'Technology demo', 'cards'),
    label('metaLabel', 'Card type label', 'Top right of each card, before the year.', 'Event', 'cards'),
    label('ctaLabel', 'Card link', 'Bottom of each card, opening the event.', 'View event', 'cards'),
    defineField({
      name: 'emptyBadges',
      title: 'Panel tags',
      type: 'array',
      description: 'Optional. Tags on the panel shown in place of the cards while no event names a partner.',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
      initialValue: ['Summits', 'Briefings'],
      fieldset: 'empty',
    }),
    defineField({
      name: 'emptyText',
      title: 'Panel message',
      type: 'text',
      rows: 3,
      description: 'The panel shown in place of the cards while no event names a partner.',
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
