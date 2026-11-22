import { HEADING_LEVELS, type HeadingLevel } from '@/lib/headings'

import { cx } from './cx'

export type KeyFinding = { key: string; value: string; text: string; note: string | null }

// Columns by item count, so every row is full: 4 → 4 / 2 / 1 (design), 3 → 3 from md, 2 → 2 from md, 1 → one cell.
const COLUMNS: Record<number, string> = {
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 header:grid-cols-4',
}

/**
 * Research report key-findings-group of key-finding-card (also the Executive Summary's Key takeaways): a bordered
 * grid of cells, each the figure (40/48 500 accent), its text (16/22.4 grey), a rule 64px lower and the note (13/18.2
 * grey). The text is a heading one level below the section heading (`headingAs`, at most h6), so the outline follows the
 * level the editor chose; under a section without a heading it is a paragraph, so no level is skipped. The rules between cells are the 1px gap over the `border` ground. Each cell is a row subgrid, so figures,
 * texts, rules and notes line up across a row without the design's JS height sync; the text keeps the design's three
 * line minimum and the note two. Without any note the rule and note rows are left out.
 */
export function KeyFindings({
  items,
  label,
  headingAs,
  variant = 'default',
}: {
  items: KeyFinding[]
  label?: string
  /** The level of the section heading above the grid; null or absent when the section has none. */
  headingAs?: HeadingLevel | null
  /** `metrics`: the partner profile At a glance row (key-findings-group `profile-metrics`), see ProfileMetrics. */
  variant?: 'default' | 'metrics'
}) {
  if (variant === 'metrics') {
    return <ProfileMetrics items={items} label={label} />
  }

  const notes = items.some((item) => item.note)
  const TextTag = headingAs ? HEADING_LEVELS[Math.min(HEADING_LEVELS.indexOf(headingAs) + 1, HEADING_LEVELS.length - 1)] : 'p'

  return (
    <ol
      aria-label={label}
      className={cx(
        'grid min-w-0 gap-px overflow-hidden rounded-sm bg-border p-px',
        COLUMNS[Math.min(items.length, 4)],
      )}
    >
      {items.map((item) => (
        <li
          key={item.key}
          className={cx('grid min-w-0 grid-rows-subgrid gap-0 bg-white p-6', notes ? 'row-span-4' : 'row-span-2')}
        >
          <span className="text-finding font-medium whitespace-nowrap text-accent">{item.value}</span>
          <TextTag className="mt-3 min-h-finding-text text-base leading-copy text-pretty text-grey">{item.text}</TextTag>
          {notes && (
            <>
              <span aria-hidden="true" className="mt-16 block h-px bg-border" />
              <p className="mt-4 min-h-finding-note text-caption text-pretty text-grey">{item.note}</p>
            </>
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * key-findings-group `profile-metrics` (partner profile At a glance): 5 columns from the header breakpoint, 3 from md, 1
 * below, in a bordered box. Each cell: the figure (40/48 500 accent), at least 24px of space, then its text (13/18.2
 * grey) under a rule, at the cell's foot; padding 16 / 20 / 24. The rules between cells are each cell's left and top
 * `shadow-cell-rule`, clipped at the box edge, so a short last row leaves the rest of the box white (the default
 * variant's 1px gap over a grey ground would fill it). The figures do not wrap, as in the design.
 */
function ProfileMetrics({ items, label }: { items: KeyFinding[]; label?: string }) {
  return (
    <ol
      aria-label={label}
      className="grid min-w-0 overflow-hidden rounded-sm bg-white inset-ring inset-ring-border md:grid-cols-3 header:grid-cols-5"
    >
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 flex-col p-4 shadow-cell-rule md:p-5 header:p-6">
          <span className="text-finding font-medium whitespace-nowrap text-accent">{item.value}</span>
          <span aria-hidden="true" className="block shrink-0 grow basis-6" />
          <p className="border-t border-border pt-4 text-caption text-pretty text-grey">{item.text}</p>
        </li>
      ))}
    </ol>
  )
}
