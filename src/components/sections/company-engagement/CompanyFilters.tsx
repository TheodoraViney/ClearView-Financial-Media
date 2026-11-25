import Form from 'next/form'

import { SearchField } from '@/components/sections/search/SearchField.client'
import { Button } from '@/components/ui/Button'
import { ClearLink } from '@/components/ui/ClearLink'
import { Dropdown } from '@/components/ui/Dropdown'
import type { CompanyFiltersView } from '@/lib/company-engagement'

import { PAD } from './layout'

// Screen-reader-only text. Visible copy comes from the CMS.
const FILTERS_LABEL = 'Search and filter companies'
// Shown only without JavaScript, where a change does not submit by itself. Kept in code: editors never need to change it.
const SUBMIT_LABEL = 'Apply filters'

/**
 * The Company Engagement page's search and filters (Claude Design wb-g-company-engagement v1.2): a GET form acting on
 * every list on the page. A change submits it, sending every list back to its first page.
 */
export function CompanyFilters({ view }: { view: CompanyFiltersView }) {
  return (
    <section aria-label={FILTERS_LABEL} className={`${PAD} pt-8 md:pt-10`}>
      <Form
        action={view.action}
        scroll={false}
        prefetch={false}
        role="search"
        className="grid items-center gap-4 border-t border-border pt-10 md:grid-cols-3 md:gap-x-8 md:gap-y-6 header:grid-cols-company-filters header:gap-8 noscript:items-start"
      >
        <div className="flex min-w-0 md:col-span-2 header:col-span-1">
          <label htmlFor="company-search" className="sr-only">
            {view.search.label}
          </label>
          <SearchField
            key={view.search.value}
            id="company-search"
            name="q"
            defaultValue={view.search.value}
            placeholder={view.search.placeholder}
            size="compact"
          />
        </div>
        {view.dropdowns.map((dropdown) => (
          <Dropdown
            key={dropdown.name}
            id={`filter-${dropdown.name}`}
            name={dropdown.name}
            label={dropdown.label}
            hideLabel
            multiple
            allLabel={dropdown.allLabel}
            selectedLabel={view.selectedLabel}
            clear={dropdown.clear}
            options={dropdown.options}
            syncKey={view.syncKey}
          />
        ))}
        <div className="hidden noscript:block">
          <Button type="submit">{SUBMIT_LABEL}</Button>
        </div>
        {view.clear && (
          <ClearLink href={view.clear.href} className="-my-1">
            {view.clear.label}
          </ClearLink>
        )}
      </Form>
    </section>
  )
}
