'use client'

import { useEffect } from 'react'

const SELECTOR = '[data-reveal]'

// As V2.2: the responsive file below lg, the desktop file from it. Chosen once, when the observer starts.
// The root reaches far above the viewport, so an element that jumps from below the viewport to above it
// (End, an anchor, restored or Back scroll) still counts as intersecting and shows instead of staying hidden.
// The threshold is a share of the element's own area, so the larger root does not change it for normal scrolling.
const DESKTOP_QUERY = '(min-width: 64rem)'
const OPTIONS: Record<'mobile' | 'desktop', IntersectionObserverInit> = {
  mobile: { threshold: 0.15, rootMargin: '100000px 0px -6% 0px' },
  desktop: { threshold: 0.18, rootMargin: '100000px 0px -8% 0px' },
}

// The breakpoints the `scroll-reveal-*` tokens and utilities switch at (md, lg, header).
const BREAKPOINT_QUERIES = ['(min-width: 48rem)', '(min-width: 64rem)', '(min-width: 75rem)']

// A CSS time in milliseconds. The CSS build may rewrite `450ms` as `.45s`.
const milliseconds = (time: string) => Number.parseFloat(time) * (time.endsWith('ms') ? 1 : 1000)

type Tokens = { index: number | null; distance: string; duration: number; stagger: number }

// The element's `--scroll-reveal-*` values at its breakpoint (globals.css), from one style read. Index `none` is null.
const readTokens = (element: Element): Tokens => {
  const style = getComputedStyle(element)
  const token = (name: string) => style.getPropertyValue(`--scroll-reveal-${name}`).trim()
  const index = token('index')

  return {
    index: index === 'none' ? null : Number.parseInt(index, 10) || 0,
    distance: token('distance'),
    duration: milliseconds(token('duration')),
    stagger: milliseconds(token('stagger')),
  }
}

/**
 * Scroll reveal for elements marked `data-reveal`, staggered and switched off per breakpoint by the
 * `scroll-reveal-*` utilities in globals.css. Rendered once by the brand layout, outside draft mode.
 *
 * Server HTML is always visible: this runs after hydration, and elements in view or above it stay as they are.
 * Elements below the viewport are held hidden and fade in once, when they scroll in. Hiding and fading are
 * Web Animations, not attributes or styles: the page segment can hydrate after this effect runs, and any DOM
 * change React did not render would be a hydration mismatch. A finished fade leaves nothing behind, so the
 * element's own transitions are untouched. Does nothing with reduced motion or without IntersectionObserver.
 */
export function RevealObserver() {
  useEffect(() => {
    const shell = document.querySelector('[data-brand]')

    if (
      !shell ||
      typeof IntersectionObserver !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const seen = new WeakSet<Element>()
    // The hidden elements, the animation that holds each one hidden and its tokens as read when hiding.
    // `breakpoint` counts breakpoint changes: tokens read under an older count are read again when showing.
    const held = new Map<Element, { animation: Animation; tokens: Tokens; breakpoint: number }>()
    let breakpoint = 0
    const options = OPTIONS[window.matchMedia(DESKTOP_QUERY).matches ? 'desktop' : 'mobile']
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-smooth').trim() || 'ease-out'

    const show = (element: Element) => {
      const hold = held.get(element)
      if (!hold) {
        return
      }
      held.delete(element)
      hold.animation.cancel()

      // After a breakpoint change the index, stagger and duration may differ; the rise starts from the held distance.
      const { index, duration, stagger } = hold.breakpoint === breakpoint ? hold.tokens : readTokens(element)
      // `none` at the new breakpoint: shown without the fade.
      if (index === null) {
        return
      }

      // `backwards` keeps the hidden frame through the stagger delay.
      element.animate(
        { opacity: [0, 1], translate: [`0 ${hold.tokens.distance}`, '0 0'] },
        { duration, delay: index * stagger, easing, fill: 'backwards' },
      )
    }

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          io.unobserve(entry.target)
          show(entry.target)
        }
      }
    }, options)

    // Reads every element's position and tokens first, then starts the holds, so layout is not forced per element.
    const hide = (elements: Iterable<Element>) => {
      const hidden: { element: Element; tokens: Tokens }[] = []

      for (const element of elements) {
        if (seen.has(element)) {
          continue
        }
        seen.add(element)

        if (element.getBoundingClientRect().top < window.innerHeight) {
          continue
        }

        const tokens = readTokens(element)
        if (tokens.index !== null) {
          hidden.push({ element, tokens })
        }
      }

      for (const { element, tokens } of hidden) {
        const frame = { opacity: 0, translate: `0 ${tokens.distance}` }
        const animation = element.animate([frame, frame], { duration: 1, fill: 'forwards' })
        held.set(element, { animation, tokens, breakpoint })
        io.observe(element)
      }
    }

    // Shows everything still hidden at once, without the fade (print, unmount).
    const revealAll = () => {
      held.forEach(({ animation }, element) => {
        io.unobserve(element)
        animation.cancel()
      })
      held.clear()
    }

    const breakpoints = BREAKPOINT_QUERIES.map((query) => window.matchMedia(query))
    const onBreakpoint = () => {
      breakpoint += 1
    }

    // Elements added later (client navigation, refreshed content) are checked on the next frame, after the
    // router has set the scroll position. Removed ones are released then if they did not come back (a React move).
    let frame = 0
    const added = new Set<Element>()
    const removed = new Set<Element>()
    const flush = () => {
      frame = 0
      // Released first, so a node removed and inserted again is handled as new.
      removed.forEach((element) => {
        if (!element.isConnected) {
          io.unobserve(element)
          held.get(element)?.animation.cancel()
          seen.delete(element)
          held.delete(element)
        }
      })
      hide(added)
      added.clear()
      removed.clear()
    }
    const collect = (node: Node, into: Set<Element>) => {
      if (node instanceof Element) {
        if (node.matches(SELECTOR)) {
          into.add(node)
        }
        node.querySelectorAll(SELECTOR).forEach((element) => into.add(element))
      }
    }

    const queue = (records: MutationRecord[]) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => collect(node, added))
        record.removedNodes.forEach((node) => collect(node, removed))
      }
      if ((added.size > 0 || removed.size > 0) && !frame) {
        frame = requestAnimationFrame(flush)
      }
    }

    // Watched: the page's <main> and the footer, each with its subtree, so header changes never reach the callback.
    // The shell itself is watched without its subtree, to follow a <main> or footer that client navigation replaces;
    // the new one arrives as an added shell child and is queued like any other added content.
    const content = new MutationObserver(queue)
    const watchContent = () => {
      content.disconnect()
      shell.querySelectorAll(':scope > main, :scope > footer').forEach((element) => {
        content.observe(element, { childList: true, subtree: true })
      })
    }
    const children = new MutationObserver((records) => {
      queue(content.takeRecords())
      watchContent()
      queue(records)
    })

    hide(document.querySelectorAll(SELECTOR))
    watchContent()
    children.observe(shell, { childList: true })
    breakpoints.forEach((query) => query.addEventListener('change', onBreakpoint))
    window.addEventListener('beforeprint', revealAll)

    return () => {
      cancelAnimationFrame(frame)
      content.disconnect()
      children.disconnect()
      breakpoints.forEach((query) => query.removeEventListener('change', onBreakpoint))
      window.removeEventListener('beforeprint', revealAll)
      revealAll()
      io.disconnect()
    }
  }, [])

  return null
}
