import Form from 'next/form'
import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListingRecord } from '@/components/ui/ListingRecord'
import { Pagination } from '@/components/ui/Pagination'
import { TabLinks } from '@/components/ui/TabLinks'
import type { RecordListingView } from '@/lib/shared-listings'

// Screen-reader-only text. Visible copy comes from the CMS.
const TABS_LABEL = 'Listings'
const FILTERS_LABEL = 'Filter records'
const PAGINATION_LABEL = 'Listing pages'
const STATUS_PREFIX = 'Status: '
// Shown only without JavaScript, where a change does not submit by itself. Kept in code: editors never need to change it.
const SUBMIT_LABEL = 'Apply filters'
const countText = (tab: string, count: number) =>
  count === 0 ? `${tab}: no records match these filters` : `${tab}: ${count} ${count === 1 ? 'record' : 'records'}`

/**
 * The awards, events and research lists of the shared listings page (Claude Design wb-g-shared-listings v1.0), in the
 * main column of a Two columns block, under the page heading: the Awards | Events | Research tabs (links to each
 * listing), the filters (single-select dropdowns that submit on change; a GET form, so they work without JavaScript
 * through the submit button shown then), Clear filters while a filter is set, then the page's records or the empty
 * state, and the pagination (not in the design: 10 records a page, the Search page's look).
 * Side padding 16 / 32 / 64; 32 / 40 above the tabs, 64 / 96 under the list. All visible text is CMS copy from the view
 * (src/sanity/shared-listings-view.ts).
 */
export function RecordListing({ view }: { view: RecordListingView }) {
  const tabLabel = view.tabs.find((tab) => tab.current)?.label ?? ''
  const { filters } = view
  // The URL state the dropdown inputs reflect (see DropdownDisclosure).
  const syncKey = filters.fields.map((field) => `${field.name}=${field.selected ?? ''}`).join('&')

  return (
    <div className="flex min-w-0 flex-col px-gutter pt-8 pb-16 md:pt-10 header:px-16 header:pb-24">
      <TabLinks items={view.tabs} label={TABS_LABEL} />

      {filters.fields.length > 0 && (
        <Form action={filters.action} scroll={false} prefetch={false} aria-label={FILTERS_LABEL} className="mt-6">
          {/* Four columns on desktop (gap 32), two on tablet (16 / 32), one on mobile (16). */}
          <div className="grid items-end gap-x-8 gap-y-4 md:grid-cols-2 header:grid-cols-4 noscript:items-start">
            {filters.fields.map((field) => (
              <Dropdown
                key={field.name}
                id={`filter-${field.name}`}
                name={field.name}
                label={field.label}
                labelTone="muted"
                // Arrow keys browse the options; Enter, Space, a click or closing the panel applies the choice.
                submitOn="confirm"
                options={[
                  { value: '', label: filters.allLabel, selected: field.selected === null },
                  ...field.options.map((option) => ({ ...option, selected: option.value === field.selected })),
                ]}
                syncKey={syncKey}
              />
            ))}
          </div>
          <div className="mt-4 hidden noscript:block">
            <Button type="submit">{SUBMIT_LABEL}</Button>
          </div>
          {filters.clear && (
            <div className="mt-4 flex">
              <Link
                href={filters.clear.href}
                prefetch={false}
                scroll={false}
                className="inline-flex min-h-11 items-center text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60 header:min-h-9"
              >
                {filters.clear.label}
              </Link>
            </div>
          )}
        </Form>
      )}

      <section aria-labelledby="listing-results-heading" className="mt-8 flex min-w-0 flex-col md:mt-10">
        <h2 id="listing-results-heading" className="sr-only">
          {tabLabel}
        </h2>
        <p aria-live="polite" className="sr-only">
          {countText(stegaClean(tabLabel), view.total)}
        </p>
        {view.empty ? (
          <EmptyState
            variant="plain"
            titleAs="h3"
            title={view.empty.heading}
            text={view.empty.text}
            action={
              <Button href={view.empty.button.href} variant="outline-accent-tint" className="px-5">
                {view.empty.button.label}
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col">
              {view.rows.map((row) => (
                <li key={row.key}>
                  <ListingRecord
                    href={row.href}
                    title={row.title}
                    meta={[row.date, row.region].filter((item): item is string => Boolean(item))}
                    status={row.status?.label}
                    statusLabel={STATUS_PREFIX}
                    description={row.standfirst}
                  />
                </li>
              ))}
            </ul>
            <Pagination
              pages={view.pagination.pages}
              previousHref={view.pagination.previousHref}
              nextHref={view.pagination.nextHref}
              previousLabel={view.pagination.previousLabel}
              nextLabel={view.pagination.nextLabel}
              label={PAGINATION_LABEL}
              size="touch"
              strongCurrent
              className="mt-10"
            />
          </>
        )}
      </section>
    </div>
  )
}
