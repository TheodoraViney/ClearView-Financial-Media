'use client'

import { useEffect, useRef } from 'react'

/**
 * After a move to another page of the same search, scrolls the results summary into view and focuses it, so the
 * reader lands on the new list and screen readers read the new range. Not on the first load, and not when the
 * search itself (term, type, years) changes. `search` is the search's URL without its page.
 */
export function SummaryFocus({ targetId, search, page }: { targetId: string; search: string; page: number }) {
  const previous = useRef({ search, page })

  useEffect(() => {
    const last = previous.current

    previous.current = { search, page }

    if (last.search !== search || last.page === page) {
      return
    }

    const summary = document.getElementById(targetId)

    if (!summary) {
      return
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // scroll-padding-top keeps it clear of the sticky header.
    summary.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    summary.focus({ preventScroll: true })
  }, [targetId, search, page])

  return null
}
