import Form from 'next/form'

import { Button } from '@/components/ui/Button'
import { SEARCH_PATH, type SearchType } from '@/lib/search-page'

import { SearchField } from './SearchField.client'

/**
 * The page's search form: a GET form to the search page with the term (`q`) and the chosen type, so a new search
 * keeps the type chip and drops the years and the page. Field and button side by side from md, stacked on mobile.
 * `next/form` navigates client-side; without JavaScript it is a plain form.
 */
export function SearchForm({
  inputId,
  titleId,
  label,
  query,
  type,
  placeholder,
  submitLabel,
}: {
  inputId: string
  /** The page heading, the search landmark's name. */
  titleId: string
  /** Screen-reader label of the field, "Search WealthBriefing". */
  label: string
  query: string
  type: SearchType | null
  placeholder: string
  submitLabel: string
}) {
  return (
    <Form
      action={SEARCH_PATH}
      prefetch={false}
      role="search"
      aria-labelledby={titleId}
      className="mt-8 flex flex-col gap-3 md:flex-row md:gap-4"
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <SearchField key={query} id={inputId} name="q" defaultValue={query} placeholder={placeholder} />
      {type && <input type="hidden" name="type" value={type} />}
      <Button type="submit" className="px-6">
        {submitLabel}
      </Button>
    </Form>
  )
}
