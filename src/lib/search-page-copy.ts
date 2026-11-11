/*
 * The Search page's copy, one "Search page" document per brand (`searchPageDocumentId` in src/brands.ts). Every field
 * is required, so the page renders the copy as the CMS holds it; the design texts live only as the schema's initial
 * values. Pure: no Sanity or Next imports, so the Studio validation and the page share the template rules.
 */

/** The copy fields of the Search page document, each a required string. */
export const SEARCH_PAGE_COPY_KEYS = [
  'title',
  'breadcrumbHome',
  'breadcrumbCurrent',
  'placeholder',
  'submitLabel',
  'allLabel',
  'articlesLabel',
  'awardsLabel',
  'eventsLabel',
  'researchLabel',
  'yearLabel',
  'allYearsLabel',
  'selectedLabel',
  'clearFiltersLabel',
  'clearAllLabel',
  'summaryTemplate',
  'typeSuffix',
  'resultSingular',
  'resultPlural',
  'articleType',
  'awardType',
  'eventType',
  'researchType',
  'previousLabel',
  'nextLabel',
  'emptyQueryTitle',
  'emptyQueryText',
  'noResultsTitle',
  'noResultsText',
  'newSearchLabel',
] as const

export type SearchPageCopyKey = (typeof SEARCH_PAGE_COPY_KEYS)[number]

export type SearchPageCopy = Record<SearchPageCopyKey, string>

export const SEARCH_RANGE_TOKEN = '{range}'
export const SEARCH_TOTAL_TOKEN = '{total}'
export const SEARCH_RESULTS_TOKEN = '{results}'
export const SEARCH_QUERY_TOKEN = '{query}'
export const SEARCH_TYPE_TOKEN = '{type}'

/** The placeholders each template field must contain exactly once; no other placeholder is filled in. */
export const SEARCH_TEMPLATE_TOKENS = {
  summaryTemplate: [SEARCH_RANGE_TOKEN, SEARCH_TOTAL_TOKEN, SEARCH_RESULTS_TOKEN, SEARCH_QUERY_TOKEN],
  typeSuffix: [SEARCH_TYPE_TOKEN],
  noResultsText: [SEARCH_QUERY_TOKEN],
} as const satisfies Partial<Record<SearchPageCopyKey, readonly string[]>>

export type SearchTemplateKey = keyof typeof SEARCH_TEMPLATE_TOKENS

const PLACEHOLDER = /\{[^}]*\}/g

/** Why a template field's value is invalid, or null when it is valid (an empty value is the required rule's job). */
export function searchTemplateError(key: SearchTemplateKey, value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const tokens: readonly string[] = SEARCH_TEMPLATE_TOKENS[key]
  const missing = tokens.find((token) => value.split(token).length !== 2)

  if (missing) {
    return `Use ${missing} exactly once`
  }

  const unknown = (value.match(PLACEHOLDER) ?? []).find((token) => !tokens.includes(token))

  return unknown ? `Unknown placeholder ${unknown}: only ${tokens.join(', ')} are filled in` : null
}

/** The document's copy, or null when any field is missing or empty (the document is unseeded or half-filled). */
export function toSearchPageCopy(doc: Partial<Record<SearchPageCopyKey, string | null>> | null | undefined): SearchPageCopy | null {
  if (!doc) {
    return null
  }

  const copy = {} as SearchPageCopy

  for (const key of SEARCH_PAGE_COPY_KEYS) {
    const value = doc[key]

    if (typeof value !== 'string' || !value.trim()) {
      return null
    }

    copy[key] = value
  }

  return copy
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (token) => values[token] ?? token)
}

/**
 * "Showing 1–16 of 29 results for “wealth management” in Articles". `first` and `last` are 1-based and inclusive;
 * a one-result range shows one number. `type` is the chosen type chip's label, or undefined for All.
 */
export function searchSummary(
  copy: Pick<SearchPageCopy, 'summaryTemplate' | 'typeSuffix' | 'resultSingular' | 'resultPlural'>,
  { first, last, total, query, type }: { first: number; last: number; total: number; query: string; type?: string },
): string {
  const summary = fill(copy.summaryTemplate, {
    [SEARCH_RANGE_TOKEN]: last > first ? `${first}–${last}` : String(first),
    [SEARCH_TOTAL_TOKEN]: String(total),
    [SEARCH_RESULTS_TOKEN]: total === 1 ? copy.resultSingular : copy.resultPlural,
    [SEARCH_QUERY_TOKEN]: query,
  })

  return type ? `${summary} ${fill(copy.typeSuffix, { [SEARCH_TYPE_TOKEN]: type })}` : summary
}

/** The no-results text with the reader's query in place of {query}. */
export function searchNoResultsText(copy: Pick<SearchPageCopy, 'noResultsText'>, query: string): string {
  return fill(copy.noResultsText, { [SEARCH_QUERY_TOKEN]: query })
}
