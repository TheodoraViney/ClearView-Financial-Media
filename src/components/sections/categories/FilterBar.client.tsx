'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { FILTER_BAR_ID } from './layout'

/**
 * The Categories filter bar's sticky shell (design v1.3 category-controls). The caller makes it `sticky` under the
 * site header; this marks it `data-stuck` while it is stuck there, so it can show its shadow. Stuck = the page is
 * scrolled and the bar's top has reached its sticky `top` (the header height), checked once per frame on scroll and
 * resize, as the design's checkStuck does.
 */
export function FilterBar({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    let frame = 0

    const check = () => {
      const bar = ref.current

      if (!bar) {
        return
      }

      const top = Number.parseFloat(getComputedStyle(bar).top) || 0

      setStuck(window.scrollY > 0 && bar.getBoundingClientRect().top <= top + 0.5)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(check)
    }

    check()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <section ref={ref} id={FILTER_BAR_ID} aria-label={label} data-stuck={stuck ? '' : undefined} className={className}>
      {children}
    </section>
  )
}
