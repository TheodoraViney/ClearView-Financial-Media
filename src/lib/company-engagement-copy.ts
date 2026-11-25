/*
 * The placeholders of the company directory block's summary lines (`companyDirectory` on the Company Engagement page),
 * shared by the Studio validation and the page. The labels themselves are the blocks' fields; the design texts live
 * only as the fields' initial values in the schema. Pure: no Sanity or Next imports.
 */

/** Where the number of companies shown goes in `summaryText`. */
export const COUNT_TOKEN = '{count}'

/** Where the number of companies in the directory goes in `summaryText`. */
export const TOTAL_TOKEN = '{total}'

/** Where `summaryFiltersText` goes in `summaryText`, with a space before it; nothing without a filter. */
export const FILTERS_TOKEN = '{filters}'

/** Where `summarySearchText` goes in `summaryText`, with a space before it; nothing without a search. */
export const SEARCH_TOKEN = '{search}'

/** Where the chosen activities and years go in `summaryFiltersText`. */
export const FILTER_VALUES_TOKEN = '{values}'

/** Where the search term goes in `summarySearchText`. */
export const TERM_TOKEN = '{term}'
