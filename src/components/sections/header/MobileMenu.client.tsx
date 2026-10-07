'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { cx } from '@/components/ui/cx'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'

import { useHeaderState } from './HeaderState.client'
import type { HeaderLink } from './types'

/** The menu button below the header breakpoint. */
export function MenuTrigger() {
  const { menuOpen, setMenuOpen, menuId, menuTrigger } = useHeaderState()

  return (
    <IconButton
      ref={menuTrigger}
      icon={menuOpen ? 'menu-close' : 'menu'}
      label={menuOpen ? 'Close menu' : 'Open menu'}
      expanded={menuOpen}
      controls={menuId}
      pressed={menuOpen}
      motion="header"
      className="header:hidden"
      onClick={() => setMenuOpen(!menuOpen)}
    />
  )
}

/**
 * The menu panel below the header breakpoint: in the page flow under the header, not modal,
 * so there is no focus trap or scroll lock (as in the design). Escape closes it and returns focus
 * to the button; a press outside or choosing a link closes it. Closed, it is `invisible`, which
 * also takes its links out of the tab order.
 */
export function MobileMenu({ className, children }: { className?: string; children: ReactNode }) {
  const { menuOpen: open, setMenuOpen, menuId, menuTrigger } = useHeaderState()
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuTrigger.current?.focus()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (!panel.current?.contains(target) && !menuTrigger.current?.contains(target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, setMenuOpen, menuTrigger])

  return (
    <nav
      ref={panel}
      id={menuId}
      aria-label="Primary"
      onClick={(event) => {
        if ((event.target as Element).closest('a')) {
          setMenuOpen(false)
        }
      }}
      className={cx(
        'absolute inset-x-0 top-full mt-px flex flex-col border-b border-border bg-white px-gutter pt-2 transition-reveal duration-180 ease-out header:hidden',
        open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1.5 opacity-0',
        className,
      )}
    >
      {children}
    </nav>
  )
}

/** A link group as an accordion row in the mobile menu (ClearView "Publications"). */
export function MenuGroup({ label, links }: { label: string; links: HeaderLink[] }) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between border-b border-border text-left text-base leading-none font-medium text-foreground"
      >
        {label}
        <Icon
          name="chevron-down"
          className={cx('transition-transform duration-180 ease-out', open && 'rotate-180')}
        />
      </button>
      <ul id={listId} hidden={!open} className="flex flex-col border-b border-border py-1">
        {links.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              className="flex min-h-11 items-center px-4 text-base leading-none text-grey transition-colors duration-180 ease-out hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
