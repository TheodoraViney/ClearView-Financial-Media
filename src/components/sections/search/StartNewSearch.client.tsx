'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'

import { buttonClasses } from '@/components/ui/Button'
import { SEARCH_PATH } from '@/lib/search-page'

/**
 * The empty states' "Start New Search": empties the search field and moves focus into it, as the design. A link to
 * the bare search page underneath, which is where it goes without JavaScript or when opened in a new tab.
 */
export function StartNewSearch({ inputId, label }: { inputId: string; label: string }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const input = document.getElementById(inputId)

    if (!(input instanceof HTMLInputElement) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    input.value = ''
    // The field's clear × listens for native input events.
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
  }

  return (
    <Link
      href={SEARCH_PATH}
      prefetch={false}
      onClick={onClick}
      className={buttonClasses({ variant: 'outline-accent', size: 'compact', className: 'px-5' })}
    >
      {label}
    </Link>
  )
}
