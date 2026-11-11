'use client'

import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'

/**
 * The search page's field: 44px, the magnifier on the left and a clear × while it holds text (search results design).
 * Uncontrolled, so the GET form submits it without JavaScript; the × follows native `input` events, which
 * `StartNewSearch` also fires when it empties the field. The caller keys it by the term, so a new search resets it.
 */
export function SearchField({
  id,
  name,
  defaultValue,
  placeholder,
}: {
  id: string
  name: string
  defaultValue: string
  placeholder: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [filled, setFilled] = useState(defaultValue.length > 0)

  useEffect(() => {
    const field = input.current

    if (!field) {
      return
    }

    const update = () => setFilled(field.value.length > 0)

    field.addEventListener('input', update)

    return () => field.removeEventListener('input', update)
  }, [])

  const clear = () => {
    if (input.current) {
      input.current.value = ''
      input.current.focus()
    }

    setFilled(false)
  }

  return (
    <div className="flex h-11 min-w-0 flex-auto items-center rounded-sm bg-white inset-ring inset-ring-input transition-shadow duration-180 ease-out hover:inset-ring-accent focus-within:inset-ring-2 focus-within:inset-ring-focus">
      <Icon name="search" className="ml-3.5 shrink-0 text-grey" />
      <input
        ref={input}
        id={id}
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 min-w-0 flex-1 border-0 bg-transparent pr-2 pl-2.5 text-base leading-copy text-foreground outline-none placeholder:text-foreground/50"
      />
      {/* Needs JavaScript to clear; without it the reader deletes the text. */}
      {filled && (
        <button
          type="button"
          aria-label="Clear search field"
          onClick={clear}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-grey transition-colors duration-180 ease-out hover:text-accent focus-visible:-outline-offset-2 noscript:hidden"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
