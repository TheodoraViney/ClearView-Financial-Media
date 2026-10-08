import { ArrowLink } from '@/components/ui/ArrowLink'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
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

// Card image sizes. Mobile: full width at 3:2, cropped at the sides: × (16/9) / (3/2) ≈ 1.19 → 120vw.
// From md the box is 216 high, so it needs at least 216 × 16/9 = 384px. Tablet: 2/5 of a row of at most
// 1023 − 64 → 384 → 420px. From lg the cards share an auto-fit grid and fewer cards stretch:
// three ≤ 400px tracks → 420px, two → half the row, one → the whole row.
const DESKTOP_SIZES = ['100vw', '50vw', '420px']
const imageSizes = (count: number) =>
  `(min-width: 64rem) ${DESKTOP_SIZES[Math.min(count, 3) - 1]}, (min-width: 48rem) 420px, 120vw`

// Scroll reveal below lg only, as in the responsive design: intro 0, cards 1–3 (the desktop file does not reveal this block).
const CARD_REVEAL = [
  'scroll-reveal-1 lg:scroll-reveal-none',
  'scroll-reveal-2 lg:scroll-reveal-none',
  'scroll-reveal-3 lg:scroll-reveal-none',
]

/**
 * Home intro: the page heading (H1 by default, the level is chosen in the CMS), a short text and one card per editorial publication.
 * Cards stack on mobile, put the image beside the text on tablet and sit in an auto-fit grid on desktop.
 */
export function Publications({ heading, body, cards }: PublicationsProps) {
  return (
    <section className="flex flex-col gap-7 border-t border-border px-gutter py-section md:gap-10 lg:gap-16">
      <div
        data-reveal
        className="flex flex-col gap-4 scroll-reveal-0 lg:flex-row lg:flex-wrap lg:items-end lg:gap-8 lg:scroll-reveal-none"
      >
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
          {cards.map((card, index) => (
            <li key={card.key} data-reveal className={CARD_REVEAL[index]}>
              <a
                href={card.href}
                className="group flex flex-col gap-5 md:flex-row md:items-center md:gap-6 lg:flex-col lg:items-stretch lg:gap-0"
              >
                <Media
                  image={card.image}
                  sizes={imageSizes(cards.length)}
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
