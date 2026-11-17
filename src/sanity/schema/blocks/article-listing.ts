import { DocumentsIcon } from '@sanity/icons/Documents'
import { defineField, defineType } from 'sanity'

import { type CategoriesLabels, isCategoriesPageDocumentId } from '@/lib/categories'

import { adminLabelField } from '../fields'

/*
 * The articles list of the Categories page (WB / WBA / FWR, /categories): the sticky Topics, Geographical focus and
 * Date sort filter bar with its "Select a topic" hint, the featured story on page 1, the cards with Banner 3, the empty
 * state and the pagination. The posts, the filter options and the URL state come from the Categories route; this block
 * holds every visible label. The design texts are the fields' initial values only: the page renders what is stored.
 */

const required = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? true : 'Required')

const label = (
  name: keyof CategoriesLabels,
  title: string,
  description: string,
  fieldset: string,
  initialValue: string,
) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    fieldset,
    initialValue,
    validation: (Rule) => Rule.custom(required),
  })

export const articleListing = defineType({
  name: 'articleListing',
  title: 'Articles list',
  type: 'object',
  icon: DocumentsIcon,
  // Only the Categories route gives the block its posts and URL state: anywhere else it would render nothing.
  validation: (Rule) =>
    Rule.custom((_value, context) =>
      isCategoriesPageDocumentId((context.document as { _id?: string } | undefined)?._id)
        ? true
        : 'This block works on the Categories page only',
    ),
  fieldsets: [
    { name: 'filters', title: 'Filters', options: { collapsible: true, collapsed: true } },
    { name: 'list', title: 'List and empty state', options: { collapsible: true, collapsed: true } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    label('topicsLabel', 'Topics filter label', 'Above the topics filter.', 'filters', 'Topics'),
    label(
      'allTopicsLabel',
      'All topics option',
      'Topics filter text when nothing is selected, and its first option.',
      'filters',
      'All topics',
    ),
    label('regionsLabel', 'Region filter label', 'Above the region filter.', 'filters', 'Geographical focus'),
    label(
      'allRegionsLabel',
      'All regions option',
      'Region filter text when nothing is selected, and its first option.',
      'filters',
      'All regions',
    ),
    label('sortLabel', 'Sort label', 'Above the date sort.', 'filters', 'Date sort'),
    label('sortLatestLabel', 'Latest first option', 'Date sort option, the default.', 'filters', 'Latest first'),
    label('sortOldestLabel', 'Oldest first option', 'Date sort option.', 'filters', 'Oldest first'),
    label(
      'selectedLabel',
      'Selected count suffix',
      'Follows the number when two or more options are chosen, for example "3 selected".',
      'filters',
      'selected',
    ),
    label(
      'topicHintLabel',
      'Topic hint',
      'Pointer beside the page heading and over the topics filter while no topic is selected. The one beside the heading scrolls to the filters.',
      'filters',
      'Select a topic',
    ),
    label('clearFiltersLabel', 'Clear filters button', 'In the open filter and in the empty state.', 'filters', 'Clear filters'),
    label(
      'emptyStateText',
      'Empty state text',
      'Shown when no article matches the filters.',
      'list',
      'No articles match the selected filters.',
    ),
    label('readArticleLabel', 'Read article link', 'On the featured story and on every card.', 'list', 'Read article'),
    label('previousLabel', 'Previous page button', 'Pagination.', 'pagination', 'Previous'),
    label('nextLabel', 'Next page button', 'Pagination.', 'pagination', 'Next'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Articles list', subtitle: 'Filters, articles and pagination', media: DocumentsIcon }
    },
  },
})
