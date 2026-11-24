'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { cx } from './cx'
import { TAB_CURRENT, TAB_IDLE, TAB_ITEM, TAB_ITEM_LOOK, TAB_ROW } from './tab-classes'

export type SectionNavItem = { id: string; label: string }

// After a click the smooth scroll passes other sections: the spy waits this long (the design's lock) so the
// clicked item stays current.
const CLICK_LOCK_MS = 900

// A section is current once its top is within this distance below the nav (the design's navH + 48).
const SPY_OFFSET = 48

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * shared-shell awards-programme-tabs as in-page anchors: 48px items 16/16, 32 apart, grey with a dark hover and the
 * current one accent with a 2px bar inside its bottom edge (`aria-current="true"`), a rule under the row, colour
 * 180ms ease-out. The row scrolls sideways without a scrollbar and keeps the current item in view. Left and Right
 * arrows move focus between items (wrapping). A click scrolls smoothly to the section (instantly with reduced
 * motion), below the sticky header and this nav (the sections carry `data-section-anchor`, see globals.css), and
 * puts its id in the address. Scrollspy: the last section whose top has passed the nav, the last one at the page end.
 * Without JavaScript the links are plain anchors. The caller makes it sticky.
 *
 * `wrap` (opt-in, awards programme page v1.10, `overflow-mode="wrap"`): the items wrap onto more rows instead of
 * scrolling, 44px high and 24 apart. The nav's height then varies, so it writes it to `--section-nav-h` on the root,
 * which the sections' scroll margin reads (globals.css), and removes it when it unmounts.
 */
export function SectionNav({ items, label, wrap = false }: { items: SectionNavItem[]; label: string; wrap?: boolean }) {
  const [current, setCurrent] = useState<string | undefined>(items[0]?.id)
  const nav = useRef<HTMLElement>(null)
  const row = useRef<HTMLUListElement>(null)
  const lock = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrolled = useRef(false)

  useEffect(() => {
    const spy = () => {
      if (lock.current || !nav.current) {
        return
      }

      const limit = nav.current.getBoundingClientRect().bottom + SPY_OFFSET
      let next: string | undefined = items[0]?.id

      for (const item of items) {
        const section = document.getElementById(item.id)

        if (section && section.getBoundingClientRect().top <= limit) {
          next = item.id
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        next = items.at(-1)?.id
      }

      setCurrent(next)
    }

    spy()
    window.addEventListener('scroll', spy, { passive: true })
    window.addEventListener('resize', spy)

    return () => {
      window.removeEventListener('scroll', spy)
      window.removeEventListener('resize', spy)
    }
  }, [items])

  useEffect(() => {
    const element = nav.current

    if (!wrap || !element) {
      return
    }

    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--section-nav-h', `${element.offsetHeight}px`)
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
      root.style.removeProperty('--section-nav-h')
    }
  }, [wrap])

  // Keep the current item in view inside the sideways-scrolling row (16px before it), smoothly after the first time.
  useEffect(() => {
    const list = row.current
    const link = list?.querySelector<HTMLElement>('[aria-current="true"]')

    if (!list || !link) {
      return
    }

    // The row is positioned, so the offset is the item's place in the scrolled content.
    const left = link.offsetLeft
    const right = left + link.offsetWidth

    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16), behavior: scrolled.current && !reducedMotion() ? 'smooth' : 'auto' })
    }

    scrolled.current = true
  }, [current])

  const go = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const section = document.getElementById(id)

    if (!section || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    if (lock.current) {
      clearTimeout(lock.current)
    }

    lock.current = setTimeout(() => {
      lock.current = null
    }, CLICK_LOCK_MS)
    setCurrent(id)
    section.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
    // Keyboard users continue from the section, as they would after a plain anchor jump.
    if (!section.hasAttribute('tabindex')) {
      section.setAttribute('tabindex', '-1')
    }
    section.focus({ preventScroll: true })
    window.history.replaceState(window.history.state, '', `#${id}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return
    }

    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a')]
    const index = links.indexOf(document.activeElement as HTMLAnchorElement)

    if (index < 0) {
      return
    }

    event.preventDefault()
    links[(index + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length]?.focus()
  }

  return (
    <nav ref={nav} aria-label={label} className="relative w-full min-w-0 border-b border-border">
      <ul
        ref={row}
        onKeyDown={onKeyDown}
        className={wrap ? 'flex flex-wrap gap-x-6 px-0.5' : cx(TAB_ROW, 'gap-8 px-0.5')}
      >
        {items.map((item) => (
          <li key={item.id} className="flex shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={item.id === current ? 'true' : undefined}
              onClick={(event) => go(event, item.id)}
              className={cx(wrap ? `h-11 ${TAB_ITEM_LOOK}` : TAB_ITEM, item.id === current ? TAB_CURRENT : TAB_IDLE)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
