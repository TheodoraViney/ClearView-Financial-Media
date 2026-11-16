import { type ReactNode } from 'react'

import { cx } from './cx'

export type AgendaListItem = {
  key: string
  /** "08:15–08:45"; null for an item without a time. */
  time: string | null
  /** The session type above the title, e.g. "Panel Session". */
  type: string | null
  /** The session title; without one the description takes its place. */
  title: string | null
  /** The description, already rendered (rich text). */
  description: ReactNode
  /** One line per speaker. */
  people: string[]
}

/**
 * shared-shell agenda-accordion `variant="list"`: the sessions as static rows (no accordion), 24px above and below
 * each, a rule between them (none above the first, none below the last). From md a 112px time column (16/22.4 grey,
 * tabular figures) beside the session, 24 apart; below md one column, the time on its own line 8px above the session.
 * Session: the type (13/13 grey), the title (20/24 500, `titleAs`), the description and the speakers (16/22.4 grey,
 * one per line, 4 apart, 8px further down), 12 apart. An item without a time keeps its empty time cell from md.
 */
export function AgendaList({ items, titleAs: Title = 'h3' }: { items: AgendaListItem[]; titleAs?: 'h3' | 'h4' }) {
  return (
    <ol className="flex min-w-0 flex-col">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid min-w-0 grid-cols-1 items-start gap-2 border-t border-border py-6 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-agenda md:gap-6"
        >
          <span
            className={cx(
              'text-base leading-copy whitespace-nowrap text-grey tabular-nums',
              !item.time && 'hidden md:block',
            )}
          >
            {item.time}
          </span>
          <div className="flex min-w-0 flex-col gap-3">
            {item.type && <p className="text-caption leading-none text-grey">{item.type}</p>}
            {item.title ? (
              <Title className="text-title-lg font-medium text-pretty wrap-anywhere text-foreground">{item.title}</Title>
            ) : null}
            {item.description}
            {item.people.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {item.people.map((person, index) => (
                  <li key={index} className="text-base leading-copy text-pretty text-grey">
                    {person}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
