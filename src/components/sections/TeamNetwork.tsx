import { RichText, type RichTextValue } from '@/components/sections/article/ArticleBody'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
import { PullQuote } from '@/components/ui/PullQuote'
import { type HeadingValue } from '@/sanity/heading'

export type TeamNetworkLogo = { key: string; image: MediaImage; href: string }

/**
 * Team photo, then heading, logos, text and quote (design wb-g-about v1.1 "publishing network"), 48 / 64 / 80 above
 * and below, the photo 40 above the text.
 * - The photo: full width, 540 high from the header breakpoint (1200), 704:400 on tablet, 4:3 on mobile; the hotspot
 *   places it.
 * - From 1200: 12 columns, gap 32; heading and logos (gap 24) in columns 1–4, text and quote (gap 32, 40 right padding)
 *   in columns 6–12. Below: stacked, gap 32 / 40.
 * Logos: two columns of at most 192 (gap 16 rows, 32 columns), each 24 high, contained to the left. Each links to its
 * publication's site in the same tab, like the Publications cards; the link is 44 high (touch target) with -10 margins
 * so the row stays 24.
 */
export function TeamNetwork({
  headingId,
  heading,
  image,
  logos,
  body,
  quote,
  quoteCaption,
}: {
  headingId: string
  heading: HeadingValue | null
  image: MediaImage | null
  logos: TeamNetworkLogo[]
  body: RichTextValue | null
  quote: RichTextValue | null
  quoteCaption: string
}) {
  return (
    <Container className="py-12 md:py-16 header:px-16 header:py-20">
      <section aria-labelledby={heading ? headingId : undefined} className="flex flex-col gap-10">
        {/*
          sizes: from 768 the box is about as wide as the photo's ratio or wider (704:400, 1312 × 540), so its width
          bounds it (100vw). Mobile 4:3 crops at the sides: 1.33 × the width.
        */}
        {image && (
          <Media
            image={image}
            sizes="(min-width: 48rem) 100vw, 134vw"
            placeholder={false}
            className="aspect-4/3 w-full bg-surface-thumb md:aspect-team header:aspect-auto header:h-135"
          />
        )}

        <div className="grid gap-8 md:gap-10 header:grid-cols-12 header:gap-8">
          <div className="flex min-w-0 flex-col gap-6 header:col-span-4">
            {heading && (
              <Heading as={heading.as} id={headingId} className="text-heading-section font-medium text-pretty">
                {heading.text}
              </Heading>
            )}
            {logos.length > 0 && (
              <ul aria-label="Publications" className="grid grid-cols-logos gap-x-8 gap-y-4">
                {logos.map((logo) => (
                  <li key={logo.key} className="flex min-w-0">
                    <a
                      href={logo.href}
                      className="-my-2.5 flex h-11 w-full items-center transition-opacity duration-180 ease-out hover:opacity-70"
                    >
                      {/* SVG logos go out untouched; 192px is the column's upper bound. */}
                      <Media image={logo.image} sizes="192px" fit="contain" className="h-6 w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-8 header:col-span-7 header:col-start-6 header:pr-10">
            {body && <RichText value={body} />}
            {quote && (
              <PullQuote quote={<RichText value={quote} size="inherit" />} cite={quoteCaption} variant="statement" />
            )}
          </div>
        </div>
      </section>
    </Container>
  )
}
