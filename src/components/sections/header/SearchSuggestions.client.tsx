'use client'

import { useEffect, useId, useState } from 'react'

import { cx } from '@/components/ui/cx'
import { ListLink } from '@/components/ui/ListLink'
import { normalizeSearchTerm, type SearchSections } from '@/lib/search-term'

import type { SearchLabels } from './types'

const SEARCH_API = '/api/search'
const DEBOUNCE_MS = 300

const SECTIONS = ['posts', 'events', 'awards', 'resources'] as const

/**
 * Suggestions for the term typed so far, from /api/search after a 300ms pause. A newer term aborts the request in
 * flight. Null until the first answer for a valid term; a failed request keeps the last answer.
 */
function useSearchSuggestions(term: string): SearchSections | null {
  const q = normalizeSearchTerm(term)
  const [result, setResult] = useState<{ q: string; sections: SearchSections } | null>(null)

  useEffect(() => {
    if (!q) {
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${SEARCH_API}?q=${encodeURIComponent(q)}`, { signal: controller.signal })

        if (response.ok) {
          setResult({ q, sections: (await response.json()) as SearchSections })
        }
      } catch {
        // Aborted by a newer term, or offline: the popup keeps what it shows.
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  // Under 2 characters nothing shows; while a newer term loads, the previous answer stays to avoid a flash.
  return q ? (result?.sections ?? null) : null
}

/**
 * The popup under the header search field: one labelled list of links per non-empty section, or "Nothing found".
 * Plain links in the tab order after the field (no listbox roles). Below md it spans the header between the gutters,
 * from md it hangs under the field at the field's width.
 */
export function SearchSuggestions({
  term,
  labels,
  hidden,
  onNavigate,
  className,
}: {
  term: string
  /** Visible copy from the header document. */
  labels: SearchLabels
  hidden: boolean
  /** Called when a suggestion is followed, so the header can close the search (client navigations keep the header). */
  onNavigate: () => void
  className?: string
}) {
  const sections = useSearchSuggestions(term)
  const id = useId()
  const shown = !hidden && sections !== null
  // A tab opened before a deploy may get an answer without one of its sections: that section counts as empty.
  const filled = sections ? SECTIONS.filter((key) => (sections[key]?.length ?? 0) > 0) : []
  const count = filled.reduce((total, key) => total + (sections?.[key].length ?? 0), 0)

  return (
    <>
      {/* Always mounted, so screen readers announce the count when it changes. */}
      <p role="status" className="sr-only">
        {shown && (count > 0 ? `${count} suggestions` : labels.empty)}
      </p>
      {shown && (
        <div
          data-search-suggestions
          onClick={(event) => {
            if ((event.target as Element).closest('a')) {
              onNavigate()
            }
          }}
          className={cx(
            'absolute inset-x-gutter top-full z-10 max-h-below-header overflow-y-auto rounded-sm border border-border bg-white py-2 md:inset-x-auto md:right-0 md:mt-2 md:w-90',
            className,
          )}
        >
          {filled.length === 0 && <p className="px-4 py-2.5 text-base text-grey">{labels.empty}</p>}
          {filled.map((key, index) => (
            <div key={key} className={cx(index > 0 && 'mt-2 border-t border-border pt-2')}>
              <p id={`${id}-${key}`} className="px-4 py-1 text-caption font-medium text-grey">
                {labels[key]}
              </p>
              <ul aria-labelledby={`${id}-${key}`}>
                {sections?.[key].map((item) => (
                  <li key={item.href}>
                    <ListLink
                      href={item.href}
                      title={item.title}
                      meta={item.meta ? [item.meta] : []}
                      className="px-4 py-2.5 hover:bg-surface-hover"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
