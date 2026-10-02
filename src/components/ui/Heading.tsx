import { type ReactNode } from 'react'

import { type HeadingLevel } from '@/lib/headings'

// The tag comes from the content; the caller's className sets the look.
export function Heading({
  as: Tag,
  className,
  children,
}: {
  as: HeadingLevel
  className?: string
  children: ReactNode
}) {
  return <Tag className={className}>{children}</Tag>
}
