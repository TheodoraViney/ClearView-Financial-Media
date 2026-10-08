import { type ReactNode } from 'react'

import { type HeadingLevel } from '@/lib/headings'

// The tag comes from the content; the caller's className sets the look.
// `reveal` marks the heading for the scroll reveal (`data-reveal`); its index utilities go in className.
export function Heading({
  as: Tag,
  reveal = false,
  className,
  children,
}: {
  as: HeadingLevel
  reveal?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tag data-reveal={reveal || undefined} className={className}>
      {children}
    </Tag>
  )
}
