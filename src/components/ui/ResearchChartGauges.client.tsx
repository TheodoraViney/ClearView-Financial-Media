'use client'

import { useEffect, useRef, useState } from 'react'

import { cx } from './cx'

export type ResearchGauge = {
  key: string
  /** Under the gauge, e.g. "2024". */
  label: string
  /** The figure as displayed, e.g. "5.3 / 7". A number at its start counts up. */
  value: string
  /** Arc fill, 0–100. */
  percent: number
  /** Accent figure. */
  current: boolean
  /** Stega-clean "{label}: {value} ({percent}% of scale)". */
  ariaLabel: string
}

// The design's timing: 1200ms, ease-out cubic, once 20% of the card is in view.
const DURATION_MS = 1200
const THRESHOLD = 0.2
const easeOutCubic = (k: number) => 1 - (1 - k) ** 3

// A half circle of radius 54 in a 120 × 66 box, its ends at y 60; the 10px stroke and round caps fill the box.
const ARC = 'M 6 60 A 54 54 0 0 1 114 60'

// A number at the start of the figure: digits with optional thousands commas and decimals, then the rest as is.
const LEADING_NUMBER = /^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?([\s\S]*)$/

/**
 * The figure at progress `t` (0–1): its leading number scaled by `t`, keeping its decimals and thousands commas
 * ("5.3 / 7" → "2.7 / 7"); the rest stays as written. A figure that does not start with a number never changes
 * (the design's rule: only the first number counts up).
 */
export function countUpValue(value: string, t: number): string {
  const match = t < 1 ? LEADING_NUMBER.exec(value) : null

  if (!match) {
    return value
  }

  const [, whole, fraction = '', rest] = match
  const decimals = Math.max(0, fraction.length - 1)
  const scaled = Number(whole.replace(/,/g, '') + fraction) * t
  const text = whole.includes(',')
    ? scaled.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : scaled.toFixed(decimals)

  return text + rest
}

/**
 * research-chart-card's chart-visual-zone: one or two half-donut gauges (stroke 10 on a `surface-thumb` track, the
 * accent arc to `percent`, the figure inside the arch in accent when `current`, the label under it), 24 apart.
 * `split`: 12px sides, max 140 wide, a rule between the two. `stacked`: max 160 wide, a rule under the zone.
 *
 * Progressive enhancement: the server renders the final state, so without JavaScript, with reduced motion, without
 * IntersectionObserver, or when the card is already in view or above it at hydration, nothing moves. Otherwise the
 * gauges reset to zero while the card is still below the viewport and, once 20% of the card (the closest `figure`)
 * is in view, the arcs grow and the leading numbers count up together over 1200ms. Printing finishes it at once.
 * Each gauge is `role="img"` with its own label, so assistive technology always reads the final figure.
 */
export function ResearchChartGauges({
  gauges,
  variant,
  className,
}: {
  gauges: ResearchGauge[]
  variant: 'split' | 'stacked'
  className?: string
}) {
  const [progress, setProgress] = useState(1)
  const zone = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = zone.current?.closest('figure') ?? zone.current

    if (
      !card ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      card.getBoundingClientRect().top < window.innerHeight
    ) {
      return
    }

    let frame = 0
    const finish = () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      setProgress(1)
    }
    const run = () => {
      observer.disconnect()
      const start = performance.now()
      const step = (now: number) => {
        const k = Math.min(1, Math.max(0, (now - start) / DURATION_MS))

        setProgress(easeOutCubic(k))
        if (k < 1) {
          frame = requestAnimationFrame(step)
        }
      }

      frame = requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && run(), {
      threshold: THRESHOLD,
    })

    setProgress(0)
    observer.observe(card)
    window.addEventListener('beforeprint', finish)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('beforeprint', finish)
    }
  }, [])

  const split = variant === 'split'

  return (
    <div
      ref={zone}
      className={cx('flex min-w-0 flex-col gap-6', !split && 'border-b border-border pb-6', className)}
    >
      {gauges.map((gauge, index) => {
        const fill = gauge.percent * progress
        const between = index < gauges.length - 1

        return (
          <div
            key={gauge.key}
            role="img"
            aria-label={gauge.ariaLabel}
            className={cx('relative flex flex-col items-center gap-2', split && 'px-3', between && 'pb-6')}
          >
            <div className={cx('relative w-full', split ? 'max-w-35' : 'max-w-40')}>
              <svg viewBox="0 0 120 66" aria-hidden="true" className="block w-full overflow-visible">
                <path d={ARC} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-surface-thumb" />
                {/* Hidden at zero: a round cap would still paint a dot. */}
                <path
                  d={ARC}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100 200"
                  strokeDashoffset={Number((100 - fill).toFixed(2))}
                  opacity={fill > 0.01 ? 1 : 0}
                  className="stroke-accent"
                />
              </svg>
              <span
                aria-hidden="true"
                className={cx(
                  'absolute inset-x-0 bottom-0 text-center text-base leading-title font-medium whitespace-nowrap tabular-nums',
                  gauge.current ? 'text-accent' : 'text-foreground',
                )}
              >
                {countUpValue(gauge.value, progress)}
              </span>
            </div>
            <span aria-hidden="true" className="text-center text-caption leading-none text-grey">
              {gauge.label}
            </span>
            {between && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-border" />}
          </div>
        )
      })}
    </div>
  )
}
