import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
import { type HeadingValue } from '@/sanity/heading'

export type ImageHeroProps = {
  breadcrumb: BreadcrumbItem[]
  eyebrow: string
  heading: HeadingValue | null
  standfirst: string
  button: { href: string; label: string } | null
  image: MediaImage | null
}

/**
 * Landing page head (design wb-g-sponsorship v1.3): breadcrumb 32 / 40 from the top, the hero 24 below it.
 * - From the header breakpoint (1200): 12 columns, gap 32, at least 400 high. Text in columns 1–4 (40 right padding)
 *   with eyebrow and H1 at the top and standfirst and button pinned to the bottom (spacer at least 40); image in
 *   columns 6–12, 400 high.
 * - Below: stacked, gap 32, spacer at least 24, image at 752 / 400. The button is full width on mobile.
 * Sides 16 / 32 / 64 (64 from 1200, as the design's own breakpoint).
 */
export function ImageHero({ breadcrumb, eyebrow, heading, standfirst, button, image }: ImageHeroProps) {
  return (
    <Container className="pt-8 md:pt-10 header:px-16">
      <Breadcrumb items={breadcrumb} />

      <section className="mt-6 grid gap-8 header:grid-cols-12 header:grid-rows-hero">
        <div className="flex min-w-0 flex-col header:col-span-4 header:pr-10">
          <div className="flex flex-col gap-4">
            {eyebrow && <p className="text-caption leading-none font-medium text-accent">{eyebrow}</p>}
            {heading && (
              <Heading as={heading.as} className="text-heading-section font-medium text-balance">
                {heading.text}
              </Heading>
            )}
          </div>

          <div aria-hidden="true" className="min-h-6 flex-auto header:min-h-10" />

          <div className="flex flex-col gap-8">
            {standfirst && <p className="text-base leading-copy text-pretty text-grey">{standfirst}</p>}
            {button && (
              <div className="flex">
                <Button href={button.href} motion="out" className="w-full md:w-auto">
                  {button.label}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* sizes: 7 of 12 columns at the 1440 frame is 752px; below 1200 the image spans the content width. */}
        {image && (
          <Media
            image={image}
            sizes="(min-width: 75rem) 752px, 100vw"
            priority
            className="aspect-hero w-full header:col-span-7 header:self-start header:col-start-6 header:h-100 header:aspect-auto"
          />
        )}
      </section>
    </Container>
  )
}
