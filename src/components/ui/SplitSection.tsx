import { type ReactNode } from 'react'

import { cx } from './cx'

/**
 * split-editorial-section (research report Executive summary, Executive Summary page sections): from the header
 * breakpoint 12 columns 32 apart, the heading on 5 with 24px to spare and the body on 7 (4px above and below, its
 * members 16 apart); stacked 24 apart below it. The caller supplies the heading element and the section's spacing.
 */
export function SplitSection({
  heading,
  className,
  children,
  ...section
}: {
  heading: ReactNode
  className?: string
  children: ReactNode
  id?: string
  'aria-labelledby'?: string
  'data-section-anchor'?: boolean
}) {
  return (
    <section {...section} className={cx('grid items-start gap-6 header:grid-cols-12 header:gap-8', className)}>
      {heading && <div className="min-w-0 header:col-span-5 header:pr-6">{heading}</div>}
      <div className="flex min-w-0 flex-col gap-4 py-1 header:col-span-7 header:col-start-6">{children}</div>
    </section>
  )
}
