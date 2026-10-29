'use client'

import { useState } from 'react'

import { cx } from '@/components/ui/cx'

export type InfographicGroup = { key: string; label: string; items: string[] }

export type InfographicProps = {
  eyebrow: string
  title: string
  intro?: string | null
  hub: string
  /** One to three: left, right, then below the centre box. */
  groups: InfographicGroup[]
  caption?: string | null
  source?: string | null
}

const EASE = 'transition-colors duration-180 ease-out'

/**
 * Article infographic: the centre box with one to three groups around it, joined by lines. From 560px wide the
 * groups sit left, right and below; narrower, they stack under the centre box. Hovering a group highlights it and
 * its line (mouse only: the groups are content, not controls, so they take no tab stop).
 * The visible text is the one accessible representation: eyebrow, title, intro, centre box, then each group.
 */
export function Infographic({ eyebrow, title, intro, hub, groups, caption, source }: InfographicProps) {
  const [active, setActive] = useState<string | null>(null)

  const on = (key: string | undefined) => key !== undefined && active === key
  const line = (key: string | undefined) => (on(key) ? 'bg-accent' : 'bg-border-plus')

  const group = (item: InfographicGroup, className?: string) => (
    <div
      key={item.key}
      role="group"
      aria-label={item.label}
      onMouseEnter={() => setActive(item.key)}
      onMouseLeave={() => setActive((current) => (current === item.key ? null : current))}
      className={cx(
        'flex min-w-0 flex-col gap-3 rounded-sm border p-5',
        EASE,
        on(item.key) ? 'border-accent bg-surface-subtle' : 'border-border bg-white',
        className,
      )}
    >
      <span className="flex items-center gap-2 text-caption leading-none font-medium text-accent">
        <span aria-hidden="true" className={cx('size-1.5 shrink-0 rounded-full', EASE, line(item.key))} />
        {item.label}
      </span>
      <ul className="flex flex-col gap-2">
        {item.items.map((text, index) => (
          <li key={index} className="text-sm leading-5 text-pretty">
            {text}
          </li>
        ))}
      </ul>
    </div>
  )

  const hubBox = (
    <div className="min-w-0 rounded-sm bg-accent px-4 py-5 text-center text-base leading-5 font-medium text-balance text-white">
      {hub}
    </div>
  )

  // A 28px vertical line ending in a dot centred on its end, from the box above to the group below. The dot overhangs
  // the line by 3px without adding height, as the design's SVG (overflow visible).
  const drop = (key: string | undefined) => (
    <span aria-hidden="true" className="relative flex h-7 w-1.5 justify-center">
      <span className={cx('h-full w-px', EASE, line(key))} />
      <span className={cx('absolute -bottom-0.75 left-0 size-1.5 rounded-full', EASE, line(key))} />
    </span>
  )

  const [left, right, below] = groups

  return (
    <figure data-flow="block" className="@container m-0 flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-8 rounded-sm border border-border bg-white px-4 py-5 @infographic:p-8">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-caption leading-none font-medium text-grey">{eyebrow}</span>
          <span className="text-title-lg font-medium break-words text-balance">{title}</span>
          {intro && <span className="text-base leading-copy text-pretty text-grey">{intro}</span>}
        </div>

        {/* Only one of the two layouts is displayed, so screen readers meet the groups once. */}
        <div className="hidden items-center @infographic:grid @infographic:grid-cols-infographic">
          {/* The centre box comes first in the source, so it is read before the groups; the grid places it. */}
          <div className="col-start-3 row-start-1">{hubBox}</div>
          {left && group(left, 'col-start-1 row-start-1')}
          {left && <span className={cx('col-start-2 row-start-1 h-px w-full', EASE, line(left.key))} />}
          {right && <span className={cx('col-start-4 row-start-1 h-px w-full', EASE, line(right.key))} />}
          {right && group(right, 'col-start-5 row-start-1')}
          {below && <div className="col-start-3 row-start-2 justify-self-center">{drop(below.key)}</div>}
          {below && group(below, 'col-span-3 col-start-2 row-start-3 mt-1')}
        </div>

        <div className="flex flex-col @infographic:hidden">
          {hubBox}
          {groups.map((item) => (
            <div key={item.key} className="flex flex-col">
              <div className="flex justify-center pb-1">{drop(item.key)}</div>
              {group(item)}
            </div>
          ))}
        </div>
      </div>
      {(caption || source) && (
        <figcaption className="flex flex-col gap-1 text-caption text-pretty text-grey">
          {caption && <span>{caption}</span>}
          {source && <span>{source}</span>}
        </figcaption>
      )}
    </figure>
  )
}
