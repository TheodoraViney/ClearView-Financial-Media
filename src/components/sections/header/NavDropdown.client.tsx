'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'

import { cx } from '@/components/ui/cx'
import { Icon } from '@/components/ui/Icon'

import type { HeaderLink } from './types'

/**
 * Desktop dropdown group of the ClearView header ("Publications"). Disclosure pattern: a button
 * with `aria-expanded` controls a plain list of links, so Tab moves through the links (no menu roles).
 * A mouse opens it on hover; a click toggles it, and a click on a hover-opened panel keeps it open.
 * Escape closes and returns focus to the button; focus leaving the group or a pointer press outside closes.
 */
export function NavDropdown({ label, links }: { label: string; links: HeaderLink[] }) {
  const [open, setOpen] = useState(false)
  // How the panel was opened, so a click right after a hover-open pins it instead of closing it.
  const openedBy = useRef<'hover' | 'click' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)

    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const show = (by: 'hover' | 'click') => {
    openedBy.current = by
    setOpen(true)
  }

  // Touch and pen get no hover: their tap is the click.
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && !open) {
      show('hover')
    }
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && openedBy.current === 'hover') {
      setOpen(false)
    }
  }

  const onClick = () => {
    if (open && openedBy.current === 'hover') {
      openedBy.current = 'click'
    } else if (open) {
      setOpen(false)
    } else {
      show('click')
    }
  }

  return (
    <div
      ref={root}
      className="relative flex items-center"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false)
          button.current?.focus()
        }
      }}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onClick}
        className="flex cursor-pointer items-center gap-2 text-sm leading-none whitespace-nowrap text-foreground transition-colors duration-180 ease-smooth hover:text-grey"
      >
        {label}
        {/* The chevron keeps the ink colour while the label greys on hover, as in the design. */}
        <Icon
          name="chevron-down"
          className={cx(
            'text-foreground transition-transform duration-180 ease-smooth',
            open && 'rotate-180',
          )}
        />
      </button>
      <ul
        id={panelId}
        className={cx(
          'absolute top-14 -left-4 flex min-w-53.5 flex-col rounded-sm border border-border bg-white py-2 transition-reveal duration-180 ease-smooth',
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1.5 opacity-0',
        )}
      >
        {links.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              className="block px-5 py-2.5 text-sm leading-copy whitespace-nowrap text-grey transition-colors duration-180 ease-smooth hover:bg-surface-hover hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
