import { ArrowLink } from '@/components/ui/ArrowLink'
import { Heading } from '@/components/ui/Heading'
import { Media } from '@/components/ui/Media'
import { type HeadingLevel } from '@/lib/headings'

export type PublicationCard = {
  key: string
  title: string
  description: string
  href: string
  image: { src: string; alt: string }
  linkLabel: string
}

export type PublicationsProps = {
  heading: { as: HeadingLevel; text: string } | null
  body?: string
  cards: PublicationCard[]
}

/**
 * Home intro: the page heading (H1 by default, the level is chosen in the CMS), a short text and one card per editorial publication.
 * Cards stack on mobile, put the image beside the text on tablet and sit in an auto-fit grid on desktop.
 */
export function Publications({ heading, body, cards }: PublicationsProps) {
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
                  src={card.image.src}
                  alt={card.image.alt}
                  ratio="3/2"
                  zoom="lg"
                  sizes="(min-width: 64rem) 33vw, (min-width: 48rem) 40vw, 100vw"
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
