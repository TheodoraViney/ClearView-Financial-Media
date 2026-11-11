/*
 * Visible copy of the Categories page (the articles list), edited per brand on the page with the slug "categories".
 * These design texts are the fields' initial values in the Studio and the seed. Screen-reader-only text
 * ("Filter articles", "Previous page", "Next page") stays in code, and so does the no-JavaScript submit button:
 * almost nobody sees it and editors have no reason to change it.
 */
export const CATEGORIES_PAGE_SLUG = 'categories'

export const CATEGORIES_INTRO_DEFAULT =
  'Explore the latest wealth-management news, analysis, interviews, research and industry insights.'

export const CATEGORIES_RELATED_HEADING_DEFAULT = 'Explore related topics'

export const CATEGORIES_LABEL_DEFAULTS = {
  topicsLabel: 'Topics',
  allTopicsLabel: 'All topics',
  regionsLabel: 'Geographical focus',
  allRegionsLabel: 'All regions',
  sortLabel: 'Date sort',
  sortLatestLabel: 'Latest first',
  sortOldestLabel: 'Oldest first',
  selectedLabel: 'selected',
  clearFiltersLabel: 'Clear filters',
  emptyStateText: 'No articles match the selected filters.',
  readArticleLabel: 'Read article',
  previousLabel: 'Previous',
  nextLabel: 'Next',
} as const

export type CategoriesLabels = { [K in keyof typeof CATEGORIES_LABEL_DEFAULTS]: string }
