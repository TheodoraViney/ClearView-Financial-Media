'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'

import { ArrowLink } from '@/components/ui/ArrowLink'
import { cx } from '@/components/ui/cx'
import { Media, type MediaSlot } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { SliderDots } from '@/components/ui/SliderDots'

import type { TopStory } from './TopStories'

// The fade runs 260ms; the slide swaps at its midpoint.
const SWAP_DELAY = 130
const SWIPE_THRESHOLD = 40

// The image box per breakpoint, matching the Media classes below. C is the content width, viewport minus both gutters
// (16 / 32 / 64 from xl), and from xl minus the 344px sidebar (`xl:w-86`); the page stops at 1440.
// From lg the image spans 7 of 12 grid columns with 32px gaps: 7(C - 352)/12 + 192 = 7C/12 - 13.33,
// and its height follows the text column, 360 (`lg:min-h-90`) unless the text runs longer.
const HERO_SLOT: MediaSlot = {
  base: { w: '100vw - 32px', aspect: 4 / 3 },
  md: { w: '100vw - 64px', aspect: 16 / 9 },
  lg: { w: '58.34vw - 50.67px', h: 360 },
  xl: { w: '58.34vw - 288.67px', h: 360 },
  page: { w: '551.34px', h: 360 },
}

/**
 * Hero slider. Renders the current slide only, so the server HTML carries slide 1 in full.
 * Below lg the text wrappers are `display: contents`, which lets `order-*` place the image
 * between the heading and the summary on mobile and after the link on tablet without duplicate DOM.
 * Because a `contents` box cannot carry opacity, below lg the whole hero fades; from lg only the
 * text column fades and the image swaps in place at the midpoint.
 */
export function TopStoriesHero({ slides, linkLabel }: { slides: TopStory[]; linkLabel: string }) {
  // `selected` follows the dots at once; `shown` swaps mid-fade.
  const [selected, setSelected] = useState(0)
  const [shown, setShown] = useState(0)
  const [visible, setVisible] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current)
    }
  }, [])

  const story = slides[shown]

  if (!story) {
    return null
  }

  const show = (index: number) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }

    const swap = () => {
      setShown(index)
      setVisible(true)
      setAnnouncement(slides[index]?.title ?? '')
    }

    setSelected(index)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      swap()
      return
    }

    setVisible(false)
    timer.current = setTimeout(swap, SWAP_DELAY)
  }

  const step = (delta: number) => show((selected + delta + slides.length) % slides.length)

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current
    const touch = event.changedTouches[0]
    touchStart.current = null

    if (!start || !touch) {
      return
    }

    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    // Mostly-vertical gestures are page scrolls, not swipes.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      step(dx < 0 ? 1 : -1)
    }
  }

  const multiple = slides.length > 1
  const meta = [story.publication, story.date].filter((item): item is string => Boolean(item))

  return (
    <div
      className={cx(
        'flex flex-col gap-5 max-lg:transition-opacity max-lg:duration-260 max-lg:ease-in-out lg:grid lg:min-h-90 lg:grid-cols-12 lg:gap-8',
        !visible && 'max-lg:opacity-0',
      )}
    >
      <div
        className={cx(
          'contents lg:col-span-5 lg:flex lg:min-h-90 lg:flex-col lg:justify-between lg:pr-6 lg:transition-opacity lg:duration-260 lg:ease-in-out',
          !visible && 'lg:opacity-0',
        )}
      >
        <div className="contents lg:flex lg:flex-col lg:gap-3">
          {meta.length > 0 && <Meta items={meta} />}
          <h2 className="text-heading-lg font-medium text-pretty text-foreground">{story.title}</h2>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          {story.excerpt && (
            <p className="order-2 text-base text-pretty text-grey md:order-none">{story.excerpt}</p>
          )}
          {story.href && linkLabel && (
            <ArrowLink href={story.href} variant="accent" className="order-2 md:order-none">
              {linkLabel}
            </ArrowLink>
          )}
        </div>
      </div>

      <Media
        image={story.image}
        slot={HERO_SLOT}
        priority={shown === 0}
        className="order-1 aspect-4/3 md:order-last md:aspect-video lg:col-span-7 lg:aspect-auto lg:h-full lg:min-h-90"
      >
        {multiple && (
          <div
            className="flex h-full items-end justify-end p-3 md:p-5 lg:p-6"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <SliderDots
              label="Top stories"
              labels={slides.map((slide, index) => `Show story ${index + 1} of ${slides.length}: ${slide.title}`)}
              selected={selected}
              onSelect={show}
            />
          </div>
        )}
      </Media>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
