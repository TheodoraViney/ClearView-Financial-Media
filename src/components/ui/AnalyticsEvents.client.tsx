'use client'

import { useEffect, useRef } from 'react'

import { SUBSCRIBED_PARAM, track, trackLinkClick } from '@/lib/analytics'

// Once per page load, also under Strict Mode's second effect run in development.
let confirmSent = false

/**
 * Page-wide analytics, once in the brand layout outside draft mode. Renders nothing.
 * - One click listener on the document sends the event a link names in `data-track` (trackAttributes and
 *   trackLinkClick in src/lib/analytics.ts). Capture phase, so a handler that stops propagation cannot hide the click.
 *   Ctrl/Cmd+click fires `click`; a middle-button open fires only `auxclick`, so that is counted too. "Open in new tab"
 *   from the context menu fires neither and is not counted.
 * - `?subscribed=1`, where the signup confirmation lands, sends `newsletter_confirm` once and is removed from the
 *   address, so a reload or a shared URL does not send it again.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    const url = new URL(window.location.href)

    if (confirmSent || !url.searchParams.has(SUBSCRIBED_PARAM)) {
      return
    }

    confirmSent = true
    track('newsletter_confirm')
    url.searchParams.delete(SUBSCRIBED_PARAM)
    // In a task of its own: on the first render this effect runs before the router's, which patches replaceState so
    // the router takes the new URL; unpatched, the router would put the parameter back on its next update. `null`, not
    // history.state: the patch copies the router's state itself, and skips the router for state that carries `__NA`.
    setTimeout(() => window.history.replaceState(null, '', url))
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.type === 'auxclick' && event.button !== 1) {
        return
      }

      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-track]') : null

      if (link) {
        trackLinkClick(link)
      }
    }

    document.addEventListener('click', onClick, { capture: true })
    document.addEventListener('auxclick', onClick, { capture: true })

    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      document.removeEventListener('auxclick', onClick, { capture: true })
    }
  }, [])

  return null
}

/**
 * Sends `article_view` each time the article is shown: on mount, and again when Next brings the page back from its
 * hidden <Activity> (back, forward, or a link to an article read before), which re-runs the effect.
 */
export function ArticleViewEvent({ source, id }: { source: 'cms' | 'archive'; id: string }) {
  // Strict Mode in development runs the effect, its cleanup and the effect again in one go. The cleanup leaves the
  // article's key here until the next task, so that immediate re-run is skipped; a later one (shown again) is not.
  const leaving = useRef<{ key: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  useEffect(() => {
    const key = `${source}:${id}`
    const left = leaving.current

    if (left) {
      clearTimeout(left.timer)
      leaving.current = null
    }

    if (left?.key !== key) {
      track('article_view', { content_source: source, article_id: id })
    }

    return () => {
      const timer = setTimeout(() => {
        leaving.current = null
      })

      leaving.current = { key, timer }
    }
  }, [source, id])

  return null
}
