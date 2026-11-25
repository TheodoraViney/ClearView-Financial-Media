'use client'

import { useEffect, useRef, useState } from 'react'

import { cx } from '@/components/ui/cx'
import { Icon } from '@/components/ui/Icon'

// `default`: the search page's 44px field, 16px text. `compact` (Company Engagement filters): 44 below the header
// breakpoint and 36 from it, like the Dropdown trigger beside it; 14px text, a 12px magnifier 16 from the edge and the
// text 40 from it.
const SIZES = {
  default: { box: 'h-11', icon: 'ml-3.5', input: 'h-11 pl-2.5 text-base leading-copy', clear: 'size-11' },
  compact: {
    box: 'h-11 header:h-9',
    icon: 'ml-4 size-3',
    input: 'h-full pl-3 text-sm leading-none',
    clear: 'size-11 header:size-9',
  },
}

/**
 * The search page's field: 44px, the magnifier on the left and a clear × while it holds text (search results design).
 * Uncontrolled, so the GET form submits it without JavaScript; the × follows native `input` events, which
 * `StartNewSearch` also fires when it empties the field. The caller keys it by the term, so a new search resets it.
 * `size` (SIZES) picks the field's height and type size.
 */
export function SearchField({
  id,
  name,
  defaultValue,
  placeholder,
  size = 'default',
}: {
  id: string
  name: string
  defaultValue: string
  placeholder: string
  size?: keyof typeof SIZES
}) {
  const classes = SIZES[size]

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
    <div
      className={cx(
        'flex min-w-0 flex-auto items-center rounded-sm bg-white inset-ring inset-ring-input transition-shadow duration-180 ease-out hover:inset-ring-accent focus-within:inset-ring-2 focus-within:inset-ring-focus',
        classes.box,
      )}
    >
      <Icon name="search" className={cx('shrink-0 text-grey', classes.icon)} />
      <input
        ref={input}
        id={id}
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className={cx(
          'min-w-0 flex-1 border-0 bg-transparent pr-2 text-foreground outline-none placeholder:text-foreground/50',
          classes.input,
        )}
      />
      {/* Needs JavaScript to clear; without it the reader deletes the text. */}
      {filled && (
        <button
          type="button"
          aria-label="Clear search field"
          onClick={clear}
          className={cx(
            'flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-grey transition-colors duration-180 ease-out hover:text-accent focus-visible:-outline-offset-2 noscript:hidden',
            classes.clear,
          )}
        >
          <Icon name="close" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
