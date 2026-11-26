import { SearchIcon } from '@sanity/icons/Search'
import { defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'
import {
  searchTemplateError,
  type SearchPageCopyKey,
  type SearchTemplateKey,
} from '@/lib/search-page-copy'

/*
 * The Search page's copy, one document per brand with the fixed id `searchPageDocumentId(key)` from `src/brands.ts`,
 * opened from each brand folder in the Studio. Every field is required; the initial values are the design texts, and
 * texts that name the publication are written per brand by the seed. Screen-reader-only text stays in code.
 */

const brandKeyOf = (id: string | undefined): string =>
  String(id ?? '').replace(/^drafts\./, '').replace(/^search-page-/, '')

type FieldOptions = { description?: string; fieldset?: string }

const text = (name: SearchPageCopyKey, title: string, group: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({
    name,
    title,
    type: 'string',
    description: options.description,
    group,
    fieldset: options.fieldset,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

/** A text with placeholders, each required exactly once (SEARCH_TEMPLATE_TOKENS); the description names them all. */
const template = (
  name: SearchTemplateKey,
  title: string,
  group: string,
  initialValue: string,
  options: FieldOptions & { description: string },
) =>
  defineField({
    name,
    title,
    type: 'string',
    description: options.description,
    group,
    fieldset: options.fieldset,
    initialValue,
    validation: (Rule) => Rule.required().custom((value: string | undefined) => searchTemplateError(name, value) ?? true),
  })

export const searchPage = defineType({
  name: 'searchPage',
  title: 'Search page',
  type: 'document',
  icon: SearchIcon,
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'filters', title: 'Filters' },
    { name: 'results', title: 'Results' },
    { name: 'empty', title: 'Empty states' },
  ],
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } },
    { name: 'searchField', title: 'Search field', options: { columns: 2 } },
    { name: 'typeChips', title: 'Content type chips', options: { columns: 2 } },
    { name: 'yearFilter', title: 'Year filter', options: { columns: 2 } },
    { name: 'resultWord', title: 'Result word in the summary', options: { columns: 2 } },
    { name: 'cardTypes', title: 'Card type labels', options: { columns: 2 } },
    { name: 'pagination', title: 'Pagination', options: { columns: 2 } },
    { name: 'noQuery', title: 'Before a search', options: { columns: 2 } },
    { name: 'noResults', title: 'No results', options: { columns: 2 } },
  ],
  fields: [
    text('title', 'Title', 'page', 'Search Results', { description: 'Also the title in search engines and the browser tab.' }),
    text('breadcrumbHome', 'Home', 'page', 'Home', { fieldset: 'breadcrumb' }),
    text('breadcrumbCurrent', 'Current page', 'page', 'Search', { fieldset: 'breadcrumb' }),
    text('placeholder', 'Placeholder', 'page', 'Search wealth management news, awards, events and research', {
      fieldset: 'searchField',
    }),
    text('submitLabel', 'Button', 'page', 'Search', { fieldset: 'searchField' }),

    // The chosen type chip's label also follows the results summary ({type} in the type suffix).
    text('allLabel', 'All types', 'filters', 'All', { fieldset: 'typeChips' }),
    text('articlesLabel', 'Articles', 'filters', 'Articles', { fieldset: 'typeChips' }),
    text('awardsLabel', 'Awards', 'filters', 'Awards', { fieldset: 'typeChips' }),
    text('eventsLabel', 'Events', 'filters', 'Events', { fieldset: 'typeChips' }),
    text('researchLabel', 'Research', 'filters', 'Research', { fieldset: 'typeChips' }),
    text('yearLabel', 'Label', 'filters', 'Year', { fieldset: 'yearFilter' }),
    text('allYearsLabel', 'All years option', 'filters', 'All years', { fieldset: 'yearFilter' }),
    text('selectedLabel', 'Selected count suffix', 'filters', 'selected', { fieldset: 'yearFilter' }),
    text('clearFiltersLabel', 'Clear filters link', 'filters', 'Clear filters', { fieldset: 'yearFilter' }),
    text('clearAllLabel', 'Clear all button', 'filters', 'Clear all'),

    template('summaryTemplate', 'Results summary', 'results', 'Showing {range} of {total} {results} for “{query}”', {
      description: '{range} is the shown range, {total} the number of results, {results} the word below, {query} the search.',
    }),
    template('typeSuffix', 'Results summary type suffix', 'results', 'in {type}', {
      description: 'Follows the summary when a type is chosen. {type} is the chip label.',
    }),
    text('resultSingular', 'One result', 'results', 'result', { fieldset: 'resultWord' }),
    text('resultPlural', 'Several results', 'results', 'results', { fieldset: 'resultWord' }),
    text('articleType', 'Article', 'results', 'Article', { fieldset: 'cardTypes' }),
    text('awardType', 'Award', 'results', 'Award', { fieldset: 'cardTypes' }),
    text('eventType', 'Event', 'results', 'Event', { fieldset: 'cardTypes' }),
    text('researchType', 'Research', 'results', 'Research', { fieldset: 'cardTypes' }),
    text('previousLabel', 'Previous button', 'results', 'Previous', { fieldset: 'pagination' }),
    text('nextLabel', 'Next button', 'results', 'Next', { fieldset: 'pagination' }),

    text('emptyQueryTitle', 'Heading', 'empty', 'What are you looking for?', { fieldset: 'noQuery' }),
    text('emptyQueryText', 'Text', 'empty', 'Search WealthBriefing articles, awards, events and research.', {
      fieldset: 'noQuery',
    }),
    text('noResultsTitle', 'Heading', 'empty', 'No results found', { fieldset: 'noResults' }),
    template(
      'noResultsText',
      'Text',
      'empty',
      'Sorry, we couldn’t find any results for ‘{query}’. Try a different search term or check your spelling.',
      { fieldset: 'noResults', description: '{query} is the search.' },
    ),
    text('newSearchLabel', 'New search button', 'empty', 'Start New Search'),
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Search page — ${isBrandKey(key) ? BRANDS[key].title : key}`, media: SearchIcon }
    },
  },
})
