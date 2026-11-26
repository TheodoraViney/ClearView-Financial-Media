import { FilterIcon } from '@sanity/icons/Filter'
import { defineType } from 'sanity'

import { adminLabelField } from '../fields'
import { label, onCompanyEngagementPage, PAGE_ONLY_MESSAGE } from './company-engagement-fields'

/**
 * The Company Engagement page's search and filters: the company name search, the Activity and Year multi-selects and
 * Clear filters. They act on every list on the page: the Activity filter hides the lists of other types, the search and
 * the Year filter narrow each list. The year options are the years of any listed record. The Activity option labels are also the activity tags on the directory's cards and its summary line.
 */
export const companyFilters = defineType({
  name: 'companyFilters',
  title: 'Company search and filters',
  type: 'object',
  icon: FilterIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) => (onCompanyEngagementPage(context.document) ? true : PAGE_ONLY_MESSAGE)),
  fieldsets: [
    { name: 'search', title: 'Search', options: { columns: 2 } },
    {
      name: 'activity',
      title: 'Activity filter',
      description: 'Each option is also the tag on the matching company cards.',
      options: { collapsible: true, collapsed: true, columns: 2 },
    },
    { name: 'year', title: 'Year filter', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    label('searchLabel', 'Field name', 'Read by screen readers only.', 'Search companies', 'search'),
    label('searchPlaceholder', 'Placeholder', undefined, 'Search companies', 'search'),
    // Beside the filters while one is set, and in each filter; clears the search and the filters.
    label('clearFiltersLabel', 'Clear filters link', undefined, 'Clear filters', 'search'),
    label('selectedLabel', 'Selected label', 'Follows the count: "2 selected".', 'selected', 'search'),

    // The "All" options are also the filter's text while nothing is chosen.
    label('activityFilterLabel', 'Filter name', 'Read by screen readers only.', 'Activity', 'activity'),
    label('activityAllLabel', '"All" option', undefined, 'All Activities', 'activity'),
    // Winners, awards sponsors and charity partners.
    label('awardsActivityLabel', 'Awards', undefined, 'Awards', 'activity'),
    // Event sponsors and technology demonstrators.
    label('forumsActivityLabel', 'Forums and summits', undefined, 'Forums and Summits', 'activity'),
    // Research report partners.
    label('researchActivityLabel', 'Research', undefined, 'Research', 'activity'),
    // Companies that contributed a post.
    label('contributedActivityLabel', 'Contributed content', undefined, 'Contributed Content', 'activity'),

    label('yearFilterLabel', 'Filter name', 'Read by screen readers only.', 'Year', 'year'),
    label('yearAllLabel', '"All" option', undefined, 'All years', 'year'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Company search and filters', subtitle: 'Company Engagement page', media: FilterIcon }
    },
  },
})
