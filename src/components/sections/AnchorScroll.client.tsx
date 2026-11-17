'use client'

import { useEffect } from 'react'

/**
 * Links to `#{targetId}` on this page scroll smoothly to the target and then focus it (instant under reduced
 * motion), as the design's primary button does. The scroll lands below the sticky header through the page's
 * `scroll-margin-top` rule. The URL is left unchanged (Roman). Renders nothing.
 *
 * The click is taken in the capture phase, before React: a prevented native event makes next/link skip its own
 * navigation, which would jump without moving focus.
 */
export function AnchorScroll({ targetId }: { targetId: string }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const link = (event.target as Element | null)?.closest?.('a[href]')

      if (!link || link.getAttribute('href') !== `#${targetId}`) {
        return
      }

      const target = document.getElementById(targetId)

      if (!target) {
        return
      }

      event.preventDefault()

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      target.focus({ preventScroll: true })
    }

    document.addEventListener('click', onClick, true)

    return () => document.removeEventListener('click', onClick, true)
  }, [targetId])

  return null
}
