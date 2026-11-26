'use client'

import { useState, type ReactNode } from 'react'

import { FilterChip } from '@/components/ui/FilterChip'

/**
 * The category group buttons of the awards programme winners: "All", then one per named group, and the groups below.
 * Every group is rendered by the server; a button only switches which ones show, so the page needs no URL state.
 * Without JavaScript the buttons hide and every group shows. One named group needs no buttons.
 */
export function GroupFilter({
  label,
  allLabel,
  groups,
}: {
  /** The button row's accessible name; screen readers only. */
  label: string
  allLabel: string
  groups: { key: string; label: string | null; content: ReactNode }[]
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const named = groups.filter((group) => group.label)

  return (
    <>
      {named.length > 1 && (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2 noscript:hidden">
          <FilterChip label={allLabel} selected={selected === null} onClick={() => setSelected(null)} />
          {named.map((group) => (
            <FilterChip
              key={group.key}
              label={group.label ?? ''}
              selected={selected === group.key}
              onClick={() => setSelected(group.key)}
            />
          ))}
        </div>
      )}
      <div aria-live="polite" className="flex flex-col gap-10">
        {groups.map((group) => (
          <div key={group.key} className={selected === null || selected === group.key ? 'contents' : 'hidden noscript:contents'}>
            {group.content}
          </div>
        ))}
      </div>
    </>
  )
}
