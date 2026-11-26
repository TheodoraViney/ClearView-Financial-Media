import { UsersIcon } from '@sanity/icons/Users'
import { defineType } from 'sanity'

import {
  COUNT_TOKEN,
  FILTER_VALUES_TOKEN,
  FILTERS_TOKEN,
  SEARCH_TOKEN,
  TERM_TOKEN,
  TOTAL_TOKEN,
} from '@/lib/company-engagement-copy'

import { adminLabelField } from '../fields'
import { label, onCompanyEngagementPage, PAGE_ONLY_MESSAGE, paginationLabels, tokensOnce } from './company-engagement-fields'

/**
 * The Company Engagement page's company directory: every company with a profile, A to Z, narrowed by the search and
 * filters block. The companies come from the awards editions, events, research reports and posts that name them. Each
 * card's activity tags are the Activity option labels of the search and filters block.
 */
export const companyDirectory = defineType({
  name: 'companyDirectory',
  title: 'Company directory',
  type: 'object',
  icon: UsersIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) => (onCompanyEngagementPage(context.document) ? true : PAGE_ONLY_MESSAGE)),
  fieldsets: [
    { name: 'summary', title: 'Summary line' },
    { name: 'cards', title: 'Cards', options: { collapsible: true, collapsed: true } },
    { name: 'empty', title: 'No results', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    label(
      'summaryDefaultText',
      'Default',
      'Shown while no search or filter is set.',
      'Showing verified company records connected to WealthBriefing activity.',
      'summary',
    ),
    label(
      'summaryText',
      'Filtered',
      `${COUNT_TOKEN} shown, ${TOTAL_TOKEN} in all, ${FILTERS_TOKEN} and ${SEARCH_TOKEN} the parts below (left out when not set).`,
      `Showing ${COUNT_TOKEN} of ${TOTAL_TOKEN} company records${FILTERS_TOKEN}${SEARCH_TOKEN}.`,
      'summary',
      tokensOnce(COUNT_TOKEN, TOTAL_TOKEN, FILTERS_TOKEN, SEARCH_TOKEN),
    ),
    label(
      'summaryFiltersText',
      'Filters part',
      `${FILTER_VALUES_TOKEN} becomes the chosen activities and years.`,
      `for ${FILTER_VALUES_TOKEN}`,
      'summary',
      tokensOnce(FILTER_VALUES_TOKEN),
    ),
    label(
      'summarySearchText',
      'Search part',
      `${TERM_TOKEN} becomes the search.`,
      `matching “${TERM_TOKEN}”`,
      'summary',
      tokensOnce(TERM_TOKEN),
    ),

    label('ctaLabel', 'Card link', undefined, 'View company profile', 'cards'),

    label(
      'noResultsText',
      'No results text',
      'Also replaces the summary line.',
      'No companies match these filters.',
      'empty',
    ),
    label('clearFiltersLabel', 'Clear filters link', undefined, 'Clear filters', 'empty'),

    ...paginationLabels('pagination'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Company directory', subtitle: 'Company Engagement page', media: UsersIcon }
    },
  },
})
