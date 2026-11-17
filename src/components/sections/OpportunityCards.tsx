import { ArrowLink } from '@/components/ui/ArrowLink'
import { Container } from '@/components/ui/Container'
import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import { HEADING_LEVELS, type HeadingLevel } from '@/lib/headings'
import { type OpportunityCardIcon } from '@/lib/opportunity-cards'
import { type HeadingValue } from '@/sanity/heading'

export type OpportunityCard = {
  key: string
  icon: OpportunityCardIcon | null
  label: string
  heading: string
  copy: string
  benefits: { key: string; text: string }[]
  link: { href: string; label: string } | null
}

// Card headings sit one level below the section heading (h3 under the design's h2), h6 at most.
const levelBelow = (level: HeadingLevel | undefined): HeadingLevel =>
  HEADING_LEVELS[Math.min(HEADING_LEVELS.indexOf(level ?? 'h2') + 1, HEADING_LEVELS.length - 1)]

/**
 * Heading and opportunity cards under a rule: 64 / 80 above, 32 / 40 inside, heading 24 above the grid of 1 / 2 / 4
 * columns (4 from 1200), gap 32. Cards alternate white and `surface-subtle` by position, as the design.
 * The link fades to 60% on hover (180ms ease-out); it is a 44px target below 1200 and text height from it. Long labels
 * wrap inside the card with the chevron to their right.
 */
export function OpportunityCards({
  headingId,
  heading,
  cards,
}: {
  headingId: string
  heading: HeadingValue | null
  cards: OpportunityCard[]
}) {
  if (cards.length === 0) {
    return null
  }

  const cardLevel = levelBelow(heading?.as)

  return (
    <Container className="mt-16 md:mt-20 header:px-16">
      <section
        aria-labelledby={heading ? headingId : undefined}
        className="flex flex-col gap-6 border-t border-border pt-8 md:pt-10"
      >
        {heading && (
          <Heading as={heading.as} id={headingId} className="text-heading-section font-medium">
            {heading.text}
          </Heading>
        )}

        <ul className="grid gap-8 md:grid-cols-2 header:grid-cols-4">
          {cards.map((card, index) => {
            const cardHeadingId = `${headingId}-${card.key}`

            return (
              <li key={card.key} className="min-w-0">
                <article
                  aria-labelledby={cardHeadingId}
                  className={cx(
                    'flex h-full flex-col gap-4 rounded-sm border border-border p-6',
                    index % 2 === 0 ? 'bg-white' : 'bg-surface-subtle',
                  )}
                >
                  {card.icon && <Icon name={card.icon} className="mb-2 size-8 shrink-0 text-accent" />}
                  <p className="text-caption leading-none font-medium text-accent">{card.label}</p>
                  <Heading as={cardLevel} id={cardHeadingId} className="text-title-lg font-medium text-pretty">
                    {card.heading}
                  </Heading>
                  <p className="text-base leading-copy text-pretty">{card.copy}</p>
                  {/* Named by the card heading, so the list needs no label text of its own. */}
                  <ul aria-labelledby={cardHeadingId} className="flex flex-col gap-3 border-t border-border pt-4">
                    {card.benefits.map((benefit) => (
                      <li key={benefit.key} className="flex min-w-0 gap-3 text-sm leading-copy text-pretty text-grey">
                        <span aria-hidden="true" className="mt-1.75 size-1.5 shrink-0 rounded-full bg-accent" />
                        <span className="min-w-0">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                  {card.link && (
                    <div className="mt-auto flex pt-2">
                      <ArrowLink href={card.link.href} variant="accent" hover="fade-tall" wrap className="header:min-h-0">
                        {card.link.label}
                      </ArrowLink>
                    </div>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      </section>
    </Container>
  )
}
