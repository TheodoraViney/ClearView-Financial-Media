'use client'

import Form from 'next/form'
import { useEffect, useId, useRef, type FormEvent } from 'react'

import { cx } from '@/components/ui/cx'
import { IconButton } from '@/components/ui/IconButton'

import { HEADER_DESKTOP_QUERY, useHeaderState } from './HeaderState.client'

/** Results page. Not built yet: the form points at the final URL and 404s until it exists. */
const SEARCH_PATH = '/search'

// Per layout: the button and field size (ClearView shrinks to 32px from the header breakpoint)
// and the button hover (ClearView fades on desktop, everything else takes the brand tint).
const VARIANTS = {
  group: {
    slot: 'header:size-8',
    form: 'header:h-8',
    closed: 'header:w-8',
    open: 'header:w-90',
    input: 'header:text-sm',
    size: 'sm',
    hover: 'surface-fade',
    closeHover: 'fade-header',
  },
  publication: {
    slot: '',
    form: '',
    closed: '',
    open: '',
    input: '',
    size: 'md',
    hover: 'surface',
    closeHover: 'none',
  },
} as const

// The field clips overflow, so the buttons draw their keyboard focus outline inside their own box.
// The input shows no outline: its caret marks focus, as in the design.
const FOCUS_INSIDE = 'focus-visible:-outline-offset-2'

/**
 * Header search: a button that opens a GET form to `/search?q=`, growing leftwards from the button.
 * Mobile: the field opens over the logo and stops before the menu button (positioned against
 * the header). From md: 360px wide, anchored to the button's slot.
 * The button submits once open; an empty submit does nothing. Escape closes and returns focus to
 * the button; a press outside or (desktop) focus leaving closes it while it is empty.
 */
export function SearchControl({
  variant,
  placeholder,
}: {
  variant: keyof typeof VARIANTS
  placeholder: string
}) {
  const { searchOpen: open, setSearchOpen } = useHeaderState()
  const slot = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const inputId = useId()
  const styles = VARIANTS[variant]

  const isEmpty = () => !input.current?.value.trim()

  // Focus the field once it opens; clear it whenever it closes (also when the menu closes it).
  useEffect(() => {
    if (open) {
      input.current?.focus()
    } else if (input.current) {
      input.current.value = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!slot.current?.contains(event.target as Node) && isEmpty()) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)

    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, setSearchOpen])

  const close = (returnFocus: boolean) => {
    setSearchOpen(false)

    if (returnFocus) {
      button.current?.focus()
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isEmpty()) {
      event.preventDefault()
    }
  }

  return (
    // Below md the slot is not positioned, so the field is placed against the header.
    <div ref={slot} className={cx('size-11 shrink-0 md:relative', styles.slot)}>
      <Form
        action={SEARCH_PATH}
        role="search"
        onSubmit={onSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation()
            close(true)
          }
        }}
        onBlur={(event) => {
          if (
            !slot.current?.contains(event.relatedTarget as Node | null) &&
            isEmpty() &&
            window.matchMedia(HEADER_DESKTOP_QUERY).matches
          ) {
            close(false)
          }
        }}
        className={cx(
          'absolute top-1.5 right-17 z-10 flex h-11 items-center overflow-hidden rounded-sm bg-white inset-ring transition-search md:top-0 md:right-0',
          styles.form,
          open
            ? cx('w-search-mobile inset-ring-accent-subtle md:w-90', styles.open)
            : cx('w-11 inset-ring-transparent md:w-11', styles.closed),
        )}
      >
        <IconButton
          ref={button}
          icon="search"
          type={open ? 'submit' : 'button'}
          label={open ? 'Submit search' : 'Open search'}
          expanded={open}
          controls={inputId}
          size={styles.size}
          variant={styles.hover}
          motion="header"
          className={FOCUS_INSIDE}
          onClick={(event) => {
            if (!open) {
              event.preventDefault()
              setSearchOpen(true)
            }
          }}
        />
        <input
          ref={input}
          id={inputId}
          name="q"
          type="search"
          aria-label="Search"
          placeholder={placeholder}
          tabIndex={open ? 0 : -1}
          className={cx(
            'h-full min-w-0 flex-1 appearance-none bg-transparent pr-1 text-base leading-none text-foreground outline-none duration-200 ease-out placeholder:text-foreground/50 search-cancel-none',
            styles.input,
            // Opening shows it at once so it can take focus; closing keeps it visible until the fade ends.
            open ? 'visible opacity-100 transition-opacity' : 'invisible opacity-0 transition-reveal',
          )}
        />
        <IconButton
          icon="close"
          label="Close search"
          size={styles.size}
          variant={styles.closeHover}
          motion="header"
          tabIndex={open ? 0 : -1}
          className={cx(FOCUS_INSIDE, open ? 'visible opacity-100' : 'invisible opacity-0')}
          onClick={() => close(true)}
        />
      </Form>
    </div>
  )
}
