'use client'

import { useState, type ReactNode } from 'react'

import { FilterChip } from '@/components/ui/FilterChip'

export type WinnersFilterGroup = {
  key: string
  /** The chip label; a group without one gets no chip and shows under "All" only. */
  label: string | null
  count: number
  content: ReactNode
}

const ALL = 'all'

/**
 * The winners' category filter: an "All categories" chip and one per named group, with counts, as `aria-pressed`
 * toggles (FilterChip button mode); the chosen group shows alone. Chips wrap 12 apart from md; on mobile they form
 * one row 8 apart that scrolls sideways and bleeds to the screen edges. A choice is announced as a short screen-reader
 * status ("8 winners shown"), not by reading the cards out. Without JavaScript the chips are hidden and every group
 * shows.
 */
export function WinnersFilter({
  groups,
  allLabel,
  total,
  label,
}: {
  groups: WinnersFilterGroup[]
  allLabel: string
  total: number
  /** Accessible name of the chip group. */
  label: string
}) {
  const [selected, setSelected] = useState(ALL)
  // Empty until the reader picks a chip, so nothing is announced on load.
  const [status, setStatus] = useState('')
  const named = groups.filter((group) => group.label)
  const countLabel = (count: number) => `${count} ${count === 1 ? 'winner' : 'winners'}`
  const select = (key: string, count: number) => {
    setSelected(key)
    setStatus(`${countLabel(count)} shown`)
  }

  return (
    <>
      {named.length > 0 && (
        <div
          role="group"
          aria-label={label}
          className="relative -mx-gutter flex min-w-0 gap-2 overflow-x-auto px-gutter scrollbar-none noscript:hidden md:mx-0 md:flex-wrap md:gap-3 md:overflow-visible md:px-0"
        >
          <FilterChip
            label={allLabel}
            count={total}
            countLabel={countLabel(total)}
            selected={selected === ALL}
            onClick={() => select(ALL, total)}
          />
          {named.map((group) => (
            <FilterChip
              key={group.key}
              label={group.label ?? ''}
              count={group.count}
              countLabel={countLabel(group.count)}
              selected={selected === group.key}
              onClick={() => select(group.key, group.count)}
            />
          ))}
        </div>
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
      <div className="flex flex-col gap-10">
        {groups.map((group) => (
          <div key={group.key} hidden={selected !== ALL && selected !== group.key}>
            {group.content}
          </div>
        ))}
      </div>
    </>
  )
}
