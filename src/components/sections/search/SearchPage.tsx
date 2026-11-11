import { stegaClean } from 'next-sanity'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { SearchResultCard } from '@/components/ui/SearchResultCard'
import { pageWindow } from '@/lib/categories'
import { SEARCH_PAGE_SIZE, searchHref, type SearchState } from '@/lib/search-page'
import { searchNoResultsText, searchSummary, type SearchPageCopy } from '@/lib/search-page-copy'
import type { SearchResultsView } from '@/lib/search-results'

import { SEARCH_TYPE_CARD_LABELS, SEARCH_TYPE_CHIP_LABELS } from './labels'
import { SearchForm } from './SearchForm'
import { SearchToolbar } from './SearchToolbar'
import { StartNewSearch } from './StartNewSearch.client'
import { SummaryFocus } from './SummaryFocus.client'

const TITLE_ID = 'search-title'
const INPUT_ID = 'search-query'
const SUMMARY_ID = 'search-summary'

/**
 * The search results page (search results design), the same on every brand: one 948px column with the breadcrumb,
 * title and search form. With a term: the type chips and Year filter, the summary, the result list and pagination,
 * or the no-results panel. Without one (none given, or too short): the empty-query panel.
 */
export function SearchPage({
  copy,
  state,
  view,
  label,
}: {
  copy: SearchPageCopy
  state: SearchState
  /** Null without a term. */
  view: SearchResultsView | null
  /** Screen-reader label of the search field. */
  label: string
}) {
  const { q } = state

  return (
    <main className="px-gutter pt-8 pb-16 md:pt-10 md:pb-20">
      <div className="mx-auto flex w-full max-w-237 min-w-0 flex-col">
        <Breadcrumb items={[{ label: copy.breadcrumbHome, href: '/' }, { label: copy.breadcrumbCurrent }]} />
        <h1 id={TITLE_ID} className="mt-6 text-heading-section font-medium wrap-anywhere">
          {copy.title}
        </h1>
        <SearchForm
          inputId={INPUT_ID}
          titleId={TITLE_ID}
          label={label}
          query={q ?? ''}
          type={state.type}
          placeholder={stegaClean(copy.placeholder)}
          submitLabel={copy.submitLabel}
        />

        {q && view ? (
          <SearchResults copy={copy} state={{ ...state, q }} view={view} />
        ) : (
          <EmptyState
            title={copy.emptyQueryTitle}
            text={copy.emptyQueryText}
            action={<StartNewSearch inputId={INPUT_ID} label={copy.newSearchLabel} />}
            className="mt-10"
          />
        )}
      </div>
    </main>
  )
}

function SearchResults({
  copy,
  state,
  view,
}: {
  copy: SearchPageCopy
  state: SearchState & { q: string }
  view: SearchResultsView
}) {
  const first = (view.page - 1) * SEARCH_PAGE_SIZE + 1
  const href = (page: number) => searchHref({ ...state, page })

  return (
    <>
      <SearchToolbar state={state} view={view} copy={copy} />

      {view.items.length > 0 ? (
        <>
          <div className="mt-8">
            <p id={SUMMARY_ID} tabIndex={-1} aria-live="polite" className="mb-2 text-sm text-grey outline-none">
              {searchSummary(copy, {
                first,
                last: first + view.items.length - 1,
                total: view.total,
                query: state.q,
                type: state.type ? copy[SEARCH_TYPE_CHIP_LABELS[state.type]] : undefined,
              })}
            </p>
            <ol aria-label="Search results" className="border-t border-border">
              {view.items.map((item) => (
                <li key={item.id} className="min-w-0">
                  <SearchResultCard
                    href={item.href}
                    typeLabel={copy[SEARCH_TYPE_CARD_LABELS[item.type]]}
                    date={item.date}
                    meta={item.meta}
                    title={item.title}
                    summary={item.summary}
                    image={item.image}
                    imageFit={item.imageFit}
                  />
                </li>
              ))}
            </ol>
          </div>
          <Pagination
            pages={pageWindow(view.page, view.pages).map((page) =>
              page ? { page, href: href(page), current: page === view.page } : null,
            )}
            previousHref={view.page > 1 ? href(view.page - 1) : null}
            nextHref={view.page < view.pages ? href(view.page + 1) : null}
            previousLabel={copy.previousLabel}
            nextLabel={copy.nextLabel}
            label="Search results pages"
            size="touch"
            strongCurrent
            className="mt-10"
          />
        </>
      ) : (
        <EmptyState
          title={copy.noResultsTitle}
          text={searchNoResultsText(copy, state.q)}
          action={<StartNewSearch inputId={INPUT_ID} label={copy.newSearchLabel} />}
          className="mt-10"
        />
      )}

      <SummaryFocus targetId={SUMMARY_ID} search={searchHref({ ...state, page: 1 })} page={view.page} />
    </>
  )
}
