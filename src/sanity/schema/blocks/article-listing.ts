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
  fieldset: string,
  initialValue: string,
  description?: string,
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
    { name: 'filters', title: 'Filters', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'list', title: 'List and empty state', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    // The "All" options are also the filter's text while nothing is selected.
    label('topicsLabel', 'Topics label', 'filters', 'Topics'),
    label('allTopicsLabel', 'All topics option', 'filters', 'All topics'),
    label('regionsLabel', 'Region label', 'filters', 'Geographical focus'),
    label('allRegionsLabel', 'All regions option', 'filters', 'All regions'),
    label('sortLabel', 'Sort label', 'filters', 'Date sort'),
    label('sortLatestLabel', 'Latest first option', 'filters', 'Latest first'),
    label('sortOldestLabel', 'Oldest first option', 'filters', 'Oldest first'),
    label('selectedLabel', 'Selected count suffix', 'filters', 'selected', 'Follows the number: "3 selected".'),
    // Beside the page heading (scrolls to the filters) and over the topics filter.
    label('topicHintLabel', 'Topic hint', 'filters', 'Select a topic', 'Shown while no topic is selected.'),
    label('clearFiltersLabel', 'Clear filters button', 'filters', 'Clear filters'),
    label('emptyStateText', 'Empty state text', 'list', 'No articles match the selected filters.'),
    label('readArticleLabel', 'Read article link', 'list', 'Read article'),
    label('previousLabel', 'Previous page', 'pagination', 'Previous'),
    label('nextLabel', 'Next page', 'pagination', 'Next'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel' },
    prepare({ adminLabel }) {
      return { title: adminLabel || 'Articles list', subtitle: 'Filters, articles and pagination', media: DocumentsIcon }
    },
  },
})
