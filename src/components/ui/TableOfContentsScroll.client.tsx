'use client'

import { useEffect } from 'react'

/**
 * Table of contents links (`a[data-toc-link]`) scroll smoothly to their heading (instantly under reduced motion),
 * focus it and put its hash in the URL without a history entry, as the design's table-of-contents does. The heading
 * lands 24px below the sticky header through its `[data-toc-target]` scroll margin. Renders nothing; without
 * JavaScript the links are plain anchors.
 */
export function TableOfContentsScroll() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const link = (event.target as Element | null)?.closest?.('a[data-toc-link]')
      const id = link?.getAttribute('href')?.slice(1)
      const target = id ? document.getElementById(id) : null

      if (!target) {
        return
      }

      event.preventDefault()

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })

      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }

      target.focus({ preventScroll: true })
      history.replaceState(history.state, '', `#${id}`)
    }

    document.addEventListener('click', onClick, true)

    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
