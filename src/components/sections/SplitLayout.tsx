import { type ReactNode } from 'react'

import { cx } from '@/components/ui/cx'

/**
 * Main column with a 364px sidebar beside it from the header breakpoint (1200px), on all four homes
 * (the ClearView home used 344 from 1280 before). Below 1200 the sidebar stacks after the main column.
 * The columns carry no gutter: each section inside brings its own.
 */
export function SplitLayout({ main, aside }: { main: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-page header:flex">
      {/* From 1200 the dividing rule is the main column's right border, not the sidebar's left one, so the sidebar keeps
          its full 364 inside: 32 + 300 + 32 for a true 300×250 MPU. */}
      <div className={cx('min-w-0 flex-1', Boolean(aside) && 'header:border-r header:border-border')}>{main}</div>
      {aside && (
        // Not an <aside>: the page's <main> holds every block, and a complementary landmark must not sit inside main.
        // Its blocks carry their own headings (Awards, Research), so no wrapper label is needed.
        <div className="flex flex-col border-t border-border header:w-91 header:shrink-0 header:border-t-0">
          {/* Fills the sidebar's height from 1200, so the last block can stretch to the bottom of the main column. */}
          <div className="flex flex-1 flex-col">{aside}</div>
        </div>
      )}
    </div>
  )
}
