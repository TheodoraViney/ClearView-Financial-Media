import { ArrowLink } from '@/components/ui/ArrowLink'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { type MediaImage, type MediaWidths, trackWidth } from '@/components/ui/Media'
import { RelativeTime } from '@/components/ui/RelativeTime'
import { type HeadingLevel } from '@/lib/headings'

export type FeaturedStory = {
  key: string
  href: string
  title: string
  publication: string | null
  /** ISO date-time. */
  publishedAt: string | null
  image: MediaImage | null
}

export type FeaturedStoriesProps = {
  heading: { as: HeadingLevel; text: string } | null
  link: { href: string; label: string } | null
  items: FeaturedStory[]
  /** ISO time the server-rendered relative dates count from (hourly cache); the browser recounts after mount. */
  now: string
}

/**
 * Card width per breakpoint for `count` cards, matching the grid below: one column, two from md (24 gap),
 * then auto-fit 240px tracks with 32 gaps (`grid-cols-cards-sm`): 3 tracks at 1024-1119, 4 from 1120 (70rem)
 * with 32 gutters and from xl with 64. Fewer cards than tracks stretch (auto-fit collapses the empty ones).
 */
function cardWidths(count: number): MediaWidths {
  const lg = Math.min(count, 3)
  const wide = Math.min(count, 4)

  return {
    base: '100vw - 32px',
    md: trackWidth(2, 24, { inset: 64 }),
    lg: trackWidth(lg, 32, { inset: 64 }),
    '70rem': trackWidth(wide, 32, { inset: 64 }),
    xl: trackWidth(wide, 32, { inset: 128 }),
    page: trackWidth(wide, 32, { px: 1440 - 128 }),
  }
}

/**
 * Home "Featured Stories": heading with a "View all" link and four story cards.
 * One column on mobile, two on tablet, auto-fit 240px tracks on desktop where every second card is tall.
 * The link keeps its colour on hover; its chevron moves on desktop only, as in the design files.
 */
export function FeaturedStories({ heading, link, items, now }: FeaturedStoriesProps) {
  if (items.length === 0) {
    return null
  }

  const widths = cardWidths(items.length)

  return (
    <section className="py-section lg:border-t lg:border-border">
      <Container className="flex flex-col gap-7 md:gap-10 lg:gap-12">
        {(heading || link) && (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 lg:gap-x-8">
            {heading && (
              <Heading
                as={heading.as}
                className="grow basis-105 text-heading-md font-medium text-pretty text-foreground"
              >
                {heading.text}
              </Heading>
            )}
            {/* The wrapper takes the row alignment; ArrowLink pins itself to self-start for column layouts. */}
            {link && (
              <div className="flex lg:ml-auto lg:py-2">
                <ArrowLink href={link.href} variant="accent" motion="responsive" hoverColor={false}>
                  {link.label}
                </ArrowLink>
              </div>
            )}
          </div>
        )}

        <ul className="grid gap-8 md:grid-cols-2 md:gap-6 lg:grid-cols-cards-sm lg:items-start lg:gap-8">
          {items.map((item, index) => (
            <li key={item.key}>
              <ArticleCard
                href={item.href}
                title={item.title}
                image={item.image}
                widths={widths}
                tall={index % 2 === 1}
                meta={[
                  item.publication,
                  item.publishedAt && <RelativeTime dateTime={item.publishedAt} now={now} />,
                ].filter(Boolean)}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
