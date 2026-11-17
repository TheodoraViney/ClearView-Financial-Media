import { type ReactNode } from 'react'

import { cx } from './cx'

const VARIANTS = {
  default: 'text-grey',
  inverse: 'text-white/50',
}

// Space between items, each side of the divider: `default` 8px, `relaxed` 16px (shared-listing-record). The row is
// shifted left by one gap plus the 1px divider.
const SPACING = {
  default: { row: '-ml-2.25 gap-x-2', item: 'pl-2', tag: 'gap-x-2' },
  relaxed: { row: '-ml-4.25 gap-x-4', item: 'pl-4', tag: 'gap-x-4' },
}

// "Publication | date" line. Items after the first get the divider.
// `accentFirst` draws the first item in the brand accent (the category label on the publication homes);
// `strongFirst` sets it in weight 500 (the type label of a search result).
export function Meta({
  items,
  variant = 'default',
  accentFirst = false,
  strongFirst = false,
  nowrap = false,
  wrapItems = false,
  spacing = 'default',
  tag,
  tagLabel,
  tagPosition = 'start',
  className,
}: {
  items: ReactNode[]
  variant?: keyof typeof VARIANTS
  accentFirst?: boolean
  strongFirst?: boolean
  /** One line, no wrapping: the first item shrinks and is cut with an ellipsis, the others keep their width. */
  nowrap?: boolean
  /**
   * Long items may wrap inside themselves (the award category line: edition title | category group), so a title
   * wider than a phone never runs out of the box. The divider then spans the item's full line height, as the design.
   */
  wrapItems?: boolean
  /**
   * A grey 24px tag before the items, with no divider after it (shared-shell metadata-row status tag: the awards
   * programme status). The tag and the items wrap as one row, 8px apart vertically.
   */
  tag?: ReactNode
  /** Screen-reader prefix of the tag, e.g. "Status: ". */
  tagLabel?: string
  /** `end` puts the tag after the items, one gap after the last (shared-listing-record). */
  tagPosition?: 'start' | 'end'
  spacing?: keyof typeof SPACING
  className?: string
}) {
  // Every item carries the divider. The row is shifted left by one gap plus the divider (9px) inside a box clipped horizontally only (descenders stay visible),
  // so the divider of whichever item starts a line, the first or one wrapped onto a new line, falls outside and is hidden.
  // The clip box reaches 4px past each side (padding cancelled by a negative margin, so nothing moves): a link inside
  // keeps its whole 2px focus ring at offset 2, and the hidden divider (9px to the left) still falls outside.
  const row = (
    <span className={cx('-mx-1 flex overflow-x-clip px-1 text-caption', VARIANTS[variant], !tag && className)}>
      <span
        className={cx(
          'flex min-w-0 items-center',
          SPACING[spacing].row,
          nowrap ? 'flex-nowrap' : cx('flex-wrap', tag ? 'gap-y-2' : 'gap-y-1'),
        )}
      >
        {items.map((item, index) => (
          <span
            key={index}
            className={cx(
              'border-l border-border',
              SPACING[spacing].item,
              wrapItems ? 'min-w-0' : 'whitespace-nowrap',
              nowrap && index === 0 ? 'block min-w-0 truncate' : 'inline-flex items-center',
              nowrap && index > 0 && 'shrink-0',
              index > 0 && !wrapItems && 'h-3.25',
              variant === 'inverse' && 'border-white/20',
              index === 0 && accentFirst && 'text-accent',
              index === 0 && strongFirst && 'font-medium',
            )}
          >
            {item}
          </span>
        ))}
      </span>
    </span>
  )

  if (!tag) {
    return row
  }

  const tagEnd = tagPosition === 'end'
  const tagBox = (
    <span
      className={cx(
        'inline-flex h-6 items-center rounded-sm bg-surface-thumb px-2 leading-none whitespace-nowrap text-foreground',
        !tagEnd && 'mr-2',
      )}
    >
      {tagLabel && <span className="sr-only">{tagLabel}</span>}
      {tag}
    </span>
  )

  return (
    <span
      className={cx(
        'flex flex-wrap items-center gap-y-2 text-caption',
        tagEnd && SPACING[spacing].tag,
        VARIANTS[variant],
        className,
      )}
    >
      {!tagEnd && tagBox}
      {items.length > 0 && row}
      {tagEnd && tagBox}
    </span>
  )
}
