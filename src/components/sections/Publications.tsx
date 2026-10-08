import { ArrowLink } from '@/components/ui/ArrowLink'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage, type MediaSlot, trackWidth } from '@/components/ui/Media'
import { type HeadingLevel } from '@/lib/headings'

export type PublicationCard = {
  key: string
  title: string
  description: string
  href: string
  image: MediaImage
  linkLabel: string
}

export type PublicationsProps = {
  heading: { as: HeadingLevel; text: string } | null
  body?: string
  cards: PublicationCard[]
}

/**
 * Image box per breakpoint for `count` cards, matching the classes below: full width at 3:2 on mobile;
 * 2/5 of the row at 216 high (`md:h-54 md:w-2/5`) on tablet; from lg one auto-fit 260px track (`grid-cols-cards`,
 * 32 gaps), still 216 high. The block sits in the main column: gutters 32, from xl 64 plus the 344px sidebar,
 * where three tracks fit from 1316px (82.25rem) and two below. Fewer cards stretch over the empty tracks.
 */
function imageSlot(count: number): MediaSlot {
  const cols = Math.min(count, 3)
  const xl = Math.min(count, 2)

  return {
    base: { w: '100vw - 32px', aspect: 3 / 2 },
    md: { w: '40vw - 25.6px', h: 216 },
    lg: { w: trackWidth(cols, 32, { inset: 64 }), h: 216 },
    xl: { w: trackWidth(xl, 32, { inset: 344 + 128 }), h: 216 },
    '82.25rem': { w: trackWidth(cols, 32, { inset: 344 + 128 }), h: 216 },
    page: { w: trackWidth(cols, 32, { px: 1440 - 344 - 128 }), h: 216 },
  }
}

/**
 * Home intro: the page heading (H1 by default, the level is chosen in the CMS), a short text and one card per editorial publication.
 * Cards stack on mobile, put the image beside the text on tablet and sit in an auto-fit grid on desktop.
 */
export function Publications({ heading, body, cards }: PublicationsProps) {
  const slot = imageSlot(cards.length)

  return (
    <section className="flex flex-col gap-7 border-t border-border px-gutter py-section md:gap-10 lg:gap-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-8">
        {heading && (
          <Heading
            as={heading.as}
            className="text-heading-lg font-medium text-pretty text-foreground lg:max-w-138 lg:grow lg:basis-110"
          >
            {heading.text}
          </Heading>
        )}
        {body && (
          <p className="max-w-140 text-base text-pretty text-grey lg:ml-auto lg:max-w-none lg:grow-0 lg:basis-96 lg:py-2">
            {body}
          </p>
        )}
      </div>

      {cards.length > 0 && (
        <ul className="flex flex-col gap-6 lg:grid lg:grid-cols-cards lg:items-start lg:gap-8">
          {cards.map((card) => (
            <li key={card.key}>
              <a
                href={card.href}
                className="group flex flex-col gap-5 md:flex-row md:items-center md:gap-6 lg:flex-col lg:items-stretch lg:gap-0"
              >
                <Media
                  image={card.image}
                  slot={slot}
                  ratio="3/2"
                  zoom="lg"
                  className="md:aspect-auto md:h-54 md:w-2/5 lg:w-full"
                />
                <div className="flex min-w-0 flex-col gap-3 md:flex-1 md:gap-4 md:py-2 lg:py-6 lg:pr-4">
                  <div className="flex flex-col gap-3">
                    <h2 className="text-title-lg font-medium text-foreground">{card.title}</h2>
                    <p className="text-base text-pretty text-grey">{card.description}</p>
                  </div>
                  {card.linkLabel && <ArrowLink variant="default">{card.linkLabel}</ArrowLink>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
