import { type ReactNode } from 'react'

import { cx } from './cx'

// A figure with an optional grey caption under it (article hero credit, body images).
export function Figure({
  caption,
  className,
  captionClassName,
  children,
}: {
  caption?: ReactNode
  className?: string
  captionClassName?: string
  children: ReactNode
}) {
  return (
    <figure className={cx('m-0 flex flex-col gap-3', className)}>
      {children}
      {caption && <figcaption className={cx('text-caption text-grey', captionClassName)}>{caption}</figcaption>}
    </figure>
  )
}
