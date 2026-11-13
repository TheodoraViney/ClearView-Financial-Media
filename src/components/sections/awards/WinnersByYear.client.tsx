'use client'

import { useState, type ChangeEvent, type ReactNode } from 'react'

import { Dropdown } from '@/components/ui/Dropdown'

/**
 * "Winners by year" (shared-shell award-winners-by-year): the heading with a year selector, and the chosen year's
 * winners. Every year's winners are rendered by the server; the selector only switches which one shows, so the page
 * needs no URL state. The selector is the shared `Dropdown` (single) outside any form: a change closes it and returns
 * focus to its trigger. Without JavaScript the selector hides and every year shows, newest first.
 */
export function WinnersByYear({
  heading,
  selectLabel,
  years,
}: {
  heading: string
  /** The selector's accessible name; screen readers only. */
  selectLabel: string
  years: { year: string; content: ReactNode }[]
}) {
  const [year, setYear] = useState(years[0]?.year ?? '')

  const onChange = (event: ChangeEvent<HTMLDivElement>) => {
    const target = event.target as unknown as HTMLInputElement

    if (target.name === 'award-year') {
      setYear(target.value)
    }
  }

  return (
    <section aria-labelledby="winners-by-year-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-x-8 gap-y-4 md:flex-row md:items-center md:justify-between">
        <h2 id="winners-by-year-heading" className="text-title-lg font-medium">
          {heading}
        </h2>
        {/* One year needs no choice. */}
        {years.length > 1 && (
          <div className="w-full shrink-0 noscript:hidden md:w-40" onChange={onChange}>
            <Dropdown
              id="award-year"
              label={selectLabel}
              name="award-year"
              hideLabel
              syncKey={year}
              options={years.map((item) => ({ value: item.year, label: item.year, selected: item.year === year }))}
            />
          </div>
        )}
      </div>
      <div aria-live="polite" className="flex flex-col gap-6">
        {years.map((item) => (
          <div key={item.year} className={item.year === year ? 'block' : 'hidden noscript:block'}>
            {item.content}
          </div>
        ))}
      </div>
    </section>
  )
}
