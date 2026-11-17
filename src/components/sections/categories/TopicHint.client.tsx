'use client'

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'

import { cx } from '@/components/ui/cx'
import { Icon } from '@/components/ui/Icon'

import { FILTER_BAR_ID } from './layout'

/*
 * The Categories page's "Select a topic" hints (design v1.2 / v1.3 topic-hint), shown while no topic is selected (the
 * server renders them only then): one beside the H1, which scrolls to the filter bar, and one over the Topics filter.
 * Each has its own dismiss cross; pressing the Topics filter (or Enter, Space or an arrow key on it) ends both. The
 * state lives for the page load, shared by the two islands. Placement as the design's placeHints: left of what it
 * points at when that leaves 16px of the viewport (and the viewport is 768 or wider), else beside the H1 / above the
 * field. Without JavaScript neither shows: nothing would dismiss them.
 */

type HintState = { done: boolean; headingOff: boolean; fieldOff: boolean }

const INITIAL: HintState = { done: false, headingOff: false, fieldOff: false }

let hintState = INITIAL
const listeners = new Set<() => void>()

function setHints(patch: Partial<HintState>) {
  hintState = { ...hintState, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function useHints() {
  return useSyncExternalStore(subscribe, () => hintState, () => INITIAL)
}

// 13px between the hint and its target (the tail and 5px), 16px of viewport left over, the 130px fallback width.
const GAP = 13
const EDGE = 16
const FALLBACK_WIDTH = 130
const MIN_VIEWPORT = 768

/** Whether the hint fits left of its anchor, re-checked on resize. */
function useFitsLeft(hintRef: RefObject<HTMLElement | null>, anchor: () => Element | null | undefined, enabled: boolean) {
  const [left, setLeft] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const place = () => {
      const target = anchor()

      if (!target) {
        return
      }

      const viewport = document.documentElement.clientWidth || window.innerWidth
      const width = hintRef.current?.offsetWidth || FALLBACK_WIDTH

      setLeft(viewport >= MIN_VIEWPORT && target.getBoundingClientRect().left - GAP - width >= EDGE)
    }

    place()
    window.addEventListener('resize', place)

    return () => window.removeEventListener('resize', place)
    // `anchor` reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hintRef])

  return left
}

const CHIP =
  'relative flex items-center gap-2 rounded-sm border border-border-plus bg-white px-2.5 py-1.25 text-xs font-normal whitespace-nowrap text-foreground shadow-hint'

// An 8px square turned 45°, two of its sides drawn, overlapping the chip's border by its own.
const TAIL = 'absolute size-2 rotate-45 border-border-plus bg-white'
const TAIL_SIDE = {
  left: '-left-1.25 top-1/2 -mt-1 border-b border-l',
  right: '-right-1.25 top-1/2 -mt-1 border-t border-r',
  bottom: '-bottom-1.25 left-1/2 -ml-1 border-r border-b',
} as const

function Tail({ side }: { side: keyof typeof TAIL_SIDE }) {
  return <span aria-hidden="true" className={cx(TAIL, TAIL_SIDE[side])} />
}

function DismissButton({ label, onClick }: { label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto relative -my-px -mr-1.5 -ml-1 flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-xs text-icon-muted transition-colors duration-180 ease-out hover:text-foreground"
    >
      <Icon name="close-sm" />
    </button>
  )
}

// Kept in code: screen-reader text only.
const DISMISS_LABEL = 'Dismiss topic hint'

/** Scrolls the filter bar to 16px under the sticky header (the design's goTopics). */
function goToFilters() {
  const bar = document.getElementById(FILTER_BAR_ID)

  if (!bar) {
    return
  }

  // The bar's sticky `top` is the header height.
  const header = Number.parseFloat(getComputedStyle(bar).top) || 0
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({
    top: Math.max(0, bar.getBoundingClientRect().top + window.scrollY - header - EDGE),
    behavior: reduce ? 'auto' : 'smooth',
  })
}

/**
 * The hint after the H1 (the H1's next sibling in a wrapping flex row), or absolutely left of it when that fits. The
 * whole chip scrolls to the filters; its label is the button.
 */
export function HeadingTopicHint({ label, filterLabel }: { label: string; filterLabel: string }) {
  const hints = useHints()
  const ref = useRef<HTMLDivElement>(null)
  const visible = !hints.done && !hints.headingOff
  const left = useFitsLeft(ref, () => ref.current?.previousElementSibling, visible)

  if (!visible) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cx('z-5 noscript:hidden', left ? 'absolute right-hint top-1/2 -translate-y-1/2' : 'relative ml-1.25')}
    >
      {/* The button inside takes keyboard users there; the rest of the chip is a larger pointer target. */}
      <div
        data-topic-hint=""
        onClick={goToFilters}
        className={cx(CHIP, 'cursor-pointer', left ? 'motion-safe:animate-hint-left' : 'motion-safe:animate-hint-right')}
      >
        <Tail side={left ? 'right' : 'left'} />
        <button type="button" className="relative cursor-pointer">
          {label}
          <span className="sr-only">: go to the {filterLabel} filter</span>
        </button>
        <DismissButton
          label={DISMISS_LABEL}
          onClick={(event) => {
            event.stopPropagation()
            setHints({ headingOff: true })
          }}
        />
      </div>
    </div>
  )
}

const END_KEYS = new Set(['Enter', ' ', 'ArrowDown', 'ArrowUp'])

const fromHint = (target: EventTarget) => target instanceof Element && target.closest('[data-topic-hint]') !== null

/**
 * The Topics filter with its hint over it: above the field, centred on it (its bottom 8px above the trigger: 52 / 44
 * from the header breakpoint, where the trigger is 36), or left of the trigger when that fits. A press on the filter,
 * or Enter, Space or an arrow key in it, ends both hints.
 */
export function TopicsFilterHint({
  label,
  show,
  className,
  children,
}: {
  label: string
  /** False while a topic is selected. */
  show: boolean
  className?: string
  children: ReactNode
}) {
  const hints = useHints()
  const wrapper = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const visible = show && !hints.done && !hints.fieldOff
  const left = useFitsLeft(ref, () => wrapper.current, visible)

  const end = (event: PointerEvent | KeyboardEvent) => {
    if (show && !hintState.done && !fromHint(event.target)) {
      setHints({ done: true })
    }
  }

  return (
    <div
      ref={wrapper}
      onPointerDownCapture={end}
      onKeyDownCapture={(event) => END_KEYS.has(event.key) && end(event)}
      className={cx('relative', className)}
    >
      {visible && (
        <div
          ref={ref}
          className={cx(
            'pointer-events-none absolute z-5 noscript:hidden',
            left
              ? 'right-hint bottom-5.5 translate-y-1/2 header:bottom-4.5'
              : 'bottom-13 left-1/2 -translate-x-1/2 header:bottom-11',
          )}
        >
          <div
            data-topic-hint=""
            className={cx(CHIP, left ? 'motion-safe:animate-hint-left' : 'motion-safe:animate-hint-up')}
          >
            <Tail side={left ? 'right' : 'bottom'} />
            <span className="relative">{label}</span>
            <DismissButton
              label={DISMISS_LABEL}
              onClick={(event) => {
                event.stopPropagation()
                setHints({ fieldOff: true })
              }}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
