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
    { name: 'search', title: 'Search' },
    { name: 'activity', title: 'Activity filter', options: { collapsible: true, collapsed: true } },
    { name: 'year', title: 'Year filter', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    label('searchLabel', 'Search field name', 'Read by screen readers for the company search field.', 'Search companies', 'search'),
    label('searchPlaceholder', 'Search field placeholder', 'Shown in the empty search field.', 'Search companies', 'search'),
    label(
      'clearFiltersLabel',
      'Clear filters link',
      'Clears the search and the filters: beside the filters while one is set, and in each filter.',
      'Clear filters',
      'search',
    ),
    label('selectedLabel', 'Selected label', 'After the count when a filter has several options chosen, "2 selected".', 'selected', 'search'),

    label('activityFilterLabel', 'Activity filter name', 'Read by screen readers for the Activity filter.', 'Activity', 'activity'),
    label(
      'activityAllLabel',
      'Activity filter "All" label',
      'The Activity filter while no activity is chosen, and its first option.',
      'All Activities',
      'activity',
    ),
    label(
      'awardsActivityLabel',
      'Awards option',
      'Activity filter option and company card tag: winners, awards sponsors and charity partners.',
      'Awards',
      'activity',
    ),
    label(
      'forumsActivityLabel',
      'Forums and summits option',
      'Activity filter option and company card tag: event sponsors and technology demonstrators.',
      'Forums and Summits',
      'activity',
    ),
    label('researchActivityLabel', 'Research option', 'Activity filter option and company card tag: research report partners.', 'Research', 'activity'),
    label(
      'contributedActivityLabel',
      'Contributed content option',
      'Activity filter option and company card tag: companies that contributed a post.',
      'Contributed Content',
      'activity',
    ),

    label('yearFilterLabel', 'Year filter name', 'Read by screen readers for the Year filter.', 'Year', 'year'),
    label('yearAllLabel', 'Year filter "All" label', 'The Year filter while no year is chosen, and its first option.', 'All years', 'year'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Company search and filters', subtitle: 'Company Engagement page', media: FilterIcon }
    },
  },
})
