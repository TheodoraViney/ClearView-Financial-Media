import Form from 'next/form'
import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { FilterChip } from '@/components/ui/FilterChip'
import { Icon } from '@/components/ui/Icon'
import { SEARCH_PATH, SEARCH_TYPES, searchHref, type SearchState } from '@/lib/search-page'
import type { SearchPageCopy } from '@/lib/search-page-copy'
import type { SearchResultsView } from '@/lib/search-results'

import { SEARCH_TYPE_CHIP_LABELS } from './labels'

// Active year chip and Clear all: 44 below the header breakpoint, 36 from it.
const ACTIVE_CHIP =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white pr-3 pl-3.5 text-sm leading-none whitespace-nowrap text-foreground inset-ring inset-ring-border-plus transition-shadow duration-180 ease-out hover:inset-ring-accent header:h-9'

/**
 * Content type chips (All and the four types, with counts for the term) and the Year filter, then the selected years
 * as removable chips with Clear all. Desktop: chips on the left, Year on the right; below the header breakpoint they
 * stack, Year 200px on tablet and full width on mobile. Every control is a link or a GET form (no JavaScript
 * needed); a type chip clears the years and the page, the Year form keeps the term and the type.
 */
export function SearchToolbar({
  state,
  view,
  copy,
}: {
  state: SearchState & { q: string }
  view: SearchResultsView
  copy: SearchPageCopy
}) {
  const results = (count: number) =>
    `${count} ${stegaClean(count === 1 ? copy.resultSingular : copy.resultPlural)}`
  const chips = [null, ...SEARCH_TYPES].map((type) => ({
    key: type ?? 'all',
    label: type ? copy[SEARCH_TYPE_CHIP_LABELS[type]] : copy.allLabel,
    count: view.counts[type ?? 'all'],
    href: searchHref({ q: state.q, type, years: [], page: 1 }),
    selected: state.type === type,
  }))

  // Years with results for the term and type, plus any selected one that has none, so it can still be unticked.
  const years = [...new Set([...view.yearOptions.map((option) => option.value), ...state.years])].sort((a, b) =>
    b.localeCompare(a),
  )
  const yearsCleared = searchHref({ ...state, years: [], page: 1 })
  const yearLabel = stegaClean(copy.yearLabel)

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-x-6 gap-y-4 header:flex-row header:flex-wrap header:items-center header:justify-between">
        <div role="group" aria-label="Content type" className="flex min-w-0 flex-auto flex-wrap gap-2">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              href={chip.href}
              label={chip.label}
              count={chip.count}
              countLabel={results(chip.count)}
              selected={chip.selected}
            />
          ))}
        </div>
        {years.length > 0 && (
          <Form
            action={SEARCH_PATH}
            scroll={false}
            prefetch={false}
            aria-label="Filter results"
            className="flex w-full flex-col gap-4 md:w-50 header:ml-auto header:w-40"
          >
            <input type="hidden" name="q" value={state.q} />
            {state.type && <input type="hidden" name="type" value={state.type} />}
            <Dropdown
              id="filter-year"
              name="year"
              multiple
              label={copy.yearLabel}
              hideLabel
              allLabel={copy.allYearsLabel}
              selectedLabel={copy.selectedLabel}
              clear={{ label: copy.clearFiltersLabel, href: yearsCleared }}
              options={years.map((year) => ({ value: year, label: year, selected: state.years.includes(year) }))}
              syncKey={searchHref(state)}
            />
            {/* Only without JavaScript, where a change does not submit by itself. Kept in code: editors never need to change it. */}
            <div className="hidden noscript:block">
              <Button type="submit">Filter results</Button>
            </div>
          </Form>
        )}
      </div>

      {state.years.length > 0 && (
        <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {state.years.map((year) => (
            <Link
              key={year}
              href={searchHref({ ...state, years: state.years.filter((value) => value !== year), page: 1 })}
              prefetch={false}
              scroll={false}
              aria-label={`Remove ${yearLabel} filter: ${year}`}
              className={ACTIVE_CHIP}
            >
              {year}
              <Icon name="close" className="size-3" />
            </Link>
          ))}
          <Link
            href={yearsCleared}
            prefetch={false}
            scroll={false}
            className="inline-flex min-h-11 items-center px-1 text-sm leading-none text-accent transition-opacity duration-180 ease-out hover:opacity-60 header:min-h-9"
          >
            {copy.clearAllLabel}
          </Link>
        </div>
      )}
    </div>
  )
}
