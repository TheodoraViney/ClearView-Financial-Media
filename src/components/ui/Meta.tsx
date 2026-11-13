import { type ReactNode } from 'react'

import { cx } from './cx'

const VARIANTS = {
  default: 'text-grey',
  inverse: 'text-white/50',
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
  className?: string
}) {
  // Every item carries the divider. The row is shifted left by one gap plus the divider (9px) inside a box clipped horizontally only (descenders stay visible),
  // so the divider of whichever item starts a line, the first or one wrapped onto a new line, falls outside and is hidden.
  // The clip box reaches 4px past each side (padding cancelled by a negative margin, so nothing moves): a link inside
  // keeps its whole 2px focus ring at offset 2, and the hidden divider (9px to the left) still falls outside.
  return (
    <span className={cx('-mx-1 flex overflow-x-clip px-1 text-caption', VARIANTS[variant], className)}>
      <span className={cx('-ml-2.25 flex min-w-0 items-center gap-x-2', nowrap ? 'flex-nowrap' : 'flex-wrap gap-y-1')}>
        {items.map((item, index) => (
          <span
            key={index}
            className={cx(
              'border-l border-border pl-2',
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
}
