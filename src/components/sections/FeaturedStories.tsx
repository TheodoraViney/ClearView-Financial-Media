import { ArrowLink } from '@/components/ui/ArrowLink'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { type MediaImage } from '@/components/ui/Media'
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

// Card image sizes. Below lg the image is 4:3, cropped at the sides: full width × 4/3 → 134vw on mobile,
// half width × 4/3 → 67vw in the two columns from md. From lg the height is fixed and the cards are narrower
// than the crop needs: short 280 high × 16/9 ≈ 498 → 500px, tall 400 high × 16/9 ≈ 711 → 720px.
const CARD_SIZES = '(min-width: 64rem) 500px, (min-width: 48rem) 67vw, 134vw'
const TALL_CARD_SIZES = '(min-width: 64rem) 720px, (min-width: 48rem) 67vw, 134vw'

/**
 * Home "Featured Stories": heading with a "View all" link and four story cards.
 * One column on mobile, two on tablet, auto-fit 240px tracks on desktop where every second card is tall.
 * The link keeps its colour on hover; its chevron moves on desktop only, as in the design files.
 */
export function FeaturedStories({ heading, link, items, now }: FeaturedStoriesProps) {
  if (items.length === 0) {
    return null
  }

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
                sizes={index % 2 === 1 ? TALL_CARD_SIZES : CARD_SIZES}
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
