import { type ReactNode } from 'react'

import { type HeadingLevel } from '@/lib/headings'

// The tag comes from the content; the caller's className sets the look.
export function Heading({
  as: Tag,
  id,
  className,
  children,
}: {
  as: HeadingLevel
  /** For a section labelled by its heading (`aria-labelledby`). */
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  )
}
