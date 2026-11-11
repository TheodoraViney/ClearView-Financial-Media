import { SearchIcon } from '@sanity/icons/Search'
import { defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'
import {
  SEARCH_TEMPLATE_TOKENS,
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

const text = (name: SearchPageCopyKey, title: string, description: string, group: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    group,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

/** A text with placeholders, each required exactly once. */
const template = (name: SearchTemplateKey, title: string, description: string, group: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description: `${description} Placeholders: ${SEARCH_TEMPLATE_TOKENS[name].join(', ')}.`,
    group,
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
  fields: [
    text('title', 'Title', 'Heading of the page, and its title in search engines and the browser tab.', 'page', 'Search Results'),
    text('breadcrumbHome', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.', 'page', 'Home'),
    text('breadcrumbCurrent', 'Breadcrumb current label', 'Last item of the breadcrumb, this page.', 'page', 'Search'),
    text(
      'placeholder',
      'Search field placeholder',
      'Hint text inside the empty search field.',
      'page',
      'Search wealth management news, awards, events and research',
    ),
    text('submitLabel', 'Search button', 'Button that runs the search.', 'page', 'Search'),

    text('allLabel', 'All types chip', 'First content type chip: results of every type.', 'filters', 'All'),
    text('articlesLabel', 'Articles chip', 'Content type chip. Also follows the summary when chosen.', 'filters', 'Articles'),
    text('awardsLabel', 'Awards chip', 'Content type chip. Also follows the summary when chosen.', 'filters', 'Awards'),
    text('eventsLabel', 'Events chip', 'Content type chip. Also follows the summary when chosen.', 'filters', 'Events'),
    text('researchLabel', 'Research chip', 'Content type chip. Also follows the summary when chosen.', 'filters', 'Research'),
    text('yearLabel', 'Year filter label', 'Label of the year filter.', 'filters', 'Year'),
    text('allYearsLabel', 'All years option', 'Year filter text when nothing is selected, and its first option.', 'filters', 'All years'),
    text(
      'selectedLabel',
      'Selected count suffix',
      'Follows the number when two or more years are chosen, for example "3 selected".',
      'filters',
      'selected',
    ),
    text('clearFiltersLabel', 'Clear filters link', 'At the bottom of the open year filter.', 'filters', 'Clear filters'),
    text('clearAllLabel', 'Clear all button', 'After the chosen filters, removes them all.', 'filters', 'Clear all'),

    template(
      'summaryTemplate',
      'Results summary',
      'Above the results, for example "Showing 1–16 of 29 results for “wealth management”". {range} is the shown range, {total} the number of results, {results} the singular or plural word below and {query} the search.',
      'results',
      'Showing {range} of {total} {results} for “{query}”',
    ),
    template(
      'typeSuffix',
      'Results summary type suffix',
      'Follows the summary when a content type is chosen, for example "in Articles". {type} is the chip label.',
      'results',
      'in {type}',
    ),
    text('resultSingular', 'Result (one)', 'Replaces {results} in the summary when there is one result.', 'results', 'result'),
    text('resultPlural', 'Results (many)', 'Replaces {results} in the summary otherwise.', 'results', 'results'),
    text('articleType', 'Article card label', 'Type label on an article result.', 'results', 'Article'),
    text('awardType', 'Award card label', 'Type label on an awards result.', 'results', 'Award'),
    text('eventType', 'Event card label', 'Type label on an event result.', 'results', 'Event'),
    text('researchType', 'Research card label', 'Type label on a research result.', 'results', 'Research'),
    text('previousLabel', 'Previous page button', 'Pagination.', 'results', 'Previous'),
    text('nextLabel', 'Next page button', 'Pagination.', 'results', 'Next'),

    text('emptyQueryTitle', 'No search title', 'Heading shown before anything is searched.', 'empty', 'What are you looking for?'),
    text(
      'emptyQueryText',
      'No search text',
      'Text under that heading.',
      'empty',
      'Search WealthBriefing articles, awards, events and research.',
    ),
    text('noResultsTitle', 'No results title', 'Heading shown when nothing matches the search.', 'empty', 'No results found'),
    template(
      'noResultsText',
      'No results text',
      'Text under that heading. {query} is the search.',
      'empty',
      'Sorry, we couldn’t find any results for ‘{query}’. Try a different search term or check your spelling.',
    ),
    text('newSearchLabel', 'New search button', 'Under both empty states; clears the search field.', 'empty', 'Start New Search'),
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Search page — ${isBrandKey(key) ? BRANDS[key].title : key}`, media: SearchIcon }
    },
  },
})
