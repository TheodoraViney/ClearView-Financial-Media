import { type ReactNode } from 'react'

import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import type { HeadingView } from '@/lib/awards-programme'

import { SECTION } from './layout'

/**
 * A list section after the directory (winners and awards sponsors, forum and summit partners, sponsored content): the
 * heading (36/1.2 on every breakpoint) and the optional intro, max 728, 12 apart, then the list.
 */
export function EngagementSection({
  id,
  heading,
  intro,
  children,
}: {
  id: string
  heading: HeadingView
  intro: string | null
  children: ReactNode
}) {
  const headingId = `${id}-heading`

  return (
    <section id={id} aria-labelledby={heading ? headingId : undefined} className={cx(SECTION, 'scroll-mt-8')}>
      {(heading || intro) && (
        <div className="flex max-w-182 flex-col gap-3">
          {heading && (
            <Heading as={heading.as} id={headingId} className="text-heading-fixed font-medium text-pretty">
              {heading.text}
            </Heading>
          )}
          {intro && <p className="text-base leading-copy text-pretty text-grey">{intro}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
