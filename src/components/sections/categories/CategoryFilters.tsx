import Form from 'next/form'

import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import type { CategoriesLabels } from '@/lib/categories-copy'
import { CATEGORIES_PATH, categoriesHref, type CategoriesView } from '@/lib/categories'

/**
 * Topics (multi), Geographical focus (multi) and Date sort: a GET form to the list. Its fields are the URL state
 * (`topic`, `region`, `sort`, the current `category` as a hidden field); `page` is left out, so a change goes back to
 * page 1. With JavaScript a change submits at once and `next/form` navigates client-side without scrolling; without
 * it the panels show open and the submit button (shown only then) applies the choice.
 */
export function CategoryFilters({
  filters,
  state,
  labels,
  className,
}: {
  filters: CategoriesView['filters']
  state: CategoriesView['state']
  labels: CategoriesLabels
  className?: string
}) {
  const syncKey = categoriesHref(state)

  return (
    <section aria-label="Filter articles" className={className}>
      <Form
        action={CATEGORIES_PATH}
        scroll={false}
        className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 noscript:items-start"
      >
        {state.category && <input type="hidden" name="category" value={state.category} />}
        <div className="flex w-full min-w-0 flex-wrap items-end gap-4 md:w-auto noscript:items-start">
          <Dropdown
            id="filter-topics"
            name="topic"
            multiple
            label={labels.topicsLabel}
            allLabel={labels.allTopicsLabel}
            selectedLabel={labels.selectedLabel}
            clear={{ label: labels.clearFiltersLabel, href: filters.allTopicsHref }}
            options={filters.topics.map((option) => ({ value: option.slug, label: option.title, selected: option.selected }))}
            syncKey={syncKey}
            className="w-full shrink-0 md:w-55"
          />
          <Dropdown
            id="filter-regions"
            name="region"
            multiple
            label={labels.regionsLabel}
            allLabel={labels.allRegionsLabel}
            selectedLabel={labels.selectedLabel}
            clear={{ label: labels.clearFiltersLabel, href: filters.allRegionsHref }}
            options={filters.regions.map((option) => ({ value: option.slug, label: option.title, selected: option.selected }))}
            syncKey={syncKey}
            className="w-full shrink-0 md:w-55"
          />
        </div>
        <Dropdown
          id="filter-sort"
          name="sort"
          label={labels.sortLabel}
          options={[
            { value: 'latest', label: labels.sortLatestLabel, selected: state.sort === 'latest' },
            { value: 'oldest', label: labels.sortOldestLabel, selected: state.sort === 'oldest' },
          ]}
          syncKey={syncKey}
          className="w-full shrink-0 md:w-35"
        />
        {/* Only without JavaScript, where a change does not submit by itself. Kept in code: editors never need to change it. */}
        <div className="hidden w-full noscript:block">
          <Button type="submit">Filter articles</Button>
        </div>
      </Form>
    </section>
  )
}
