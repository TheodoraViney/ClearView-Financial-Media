import { ArrowLink } from './ArrowLink'
import { Heading } from './Heading'
import { type HeadingLevel } from '@/lib/headings'

/**
 * Publication section header (WB v2.0 `section-header`): the H2 (36/43.2, 28/32 on mobile) and an optional "View all"
 * link in the accent, 400 14/14 with the chevron, fading to 60% on hover. They share a row and wrap when narrow.
 */
export function SectionHeading({
  heading,
  link,
}: {
  heading: { as: HeadingLevel; text: string } | null
  link?: { href: string; label: string } | null
}) {
  if (!heading && !link) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      {heading && (
        <Heading as={heading.as} className="text-heading-section font-medium text-pretty text-foreground">
          {heading.text}
        </Heading>
      )}
      {/* The wrapper takes the row alignment; ArrowLink pins itself to self-start for column layouts. */}
      {link && (
        <div className="flex">
          <ArrowLink href={link.href} variant="accent" hover="fade">
            {link.label}
          </ArrowLink>
        </div>
      )}
    </div>
  )
}
