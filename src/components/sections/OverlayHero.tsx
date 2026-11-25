import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
import { type HeadingValue } from '@/sanity/heading'

export type OverlayHeroProps = {
  headingId: string
  breadcrumb: BreadcrumbItem[]
  heading: HeadingValue | null
  standfirst: string
  image: MediaImage | null
}

/**
 * Page head over a photo (design wb-g-about v1.1): a 4px-radius card on `foreground` while the photo loads, at least
 * 480 / 560 / 640 high, padding 24 / 32 / 40. Breadcrumb and H1 (gap 16) at the top, the standfirst at the bottom.
 * - From the header breakpoint (1200): 12 columns, gap 32; title in columns 1–4, standfirst in columns 9–12.
 * - Below: stacked (gap 24), standfirst at most 440 wide over a dark scrim rising from the bottom.
 * 24 above the card, 16 / 24 below it; sides 16 / 32 / 64 (64 from 1200, as the design's own breakpoint).
 */
export function OverlayHero({ headingId, breadcrumb, heading, standfirst, image }: OverlayHeroProps) {
  return (
    <Container className="pt-6 pb-4 header:px-16 header:pb-6">
      <section
        aria-labelledby={heading ? headingId : undefined}
        className="relative flex min-h-120 flex-col justify-between gap-6 overflow-hidden rounded-sm bg-foreground p-6 md:min-h-140 md:p-8 header:grid header:min-h-160 header:grid-cols-12 header:gap-8 header:p-10"
      >
        {/*
          sizes, upper bound per breakpoint: from 1200 the card is wider than the photo's ratio, so its width bounds it
          (100vw). 768–1199: at most 1135 wide, or 560 × 16/9 ≈ 1000 where the card crops at the sides: 1200px.
          Below 768 the card is taller than wide and crops at the sides: 480 × 16/9 ≈ 860px.
          No placeholder: the card's own dark colour shows while the photo loads.
        */}
        {image && (
          <div className="absolute inset-0">
            <Media
              image={image}
              sizes="(min-width: 75rem) 100vw, (min-width: 48rem) 1200px, 860px"
              placeholder={false}
              priority
              className="size-full"
            />
          </div>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero-scrim header:bg-none" />

        <div className="relative flex min-w-0 flex-col gap-4 header:col-span-4 header:self-start">
          <Breadcrumb items={breadcrumb} tone="inverse" />
          {heading && (
            <Heading as={heading.as} id={headingId} className="text-heading-section font-medium text-pretty text-white">
              {heading.text}
            </Heading>
          )}
        </div>

        {standfirst && (
          <p className="relative max-w-110 min-w-0 text-base leading-copy text-pretty text-white header:col-span-4 header:col-start-9 header:max-w-none header:self-end">
            {standfirst}
          </p>
        )}
      </section>
    </Container>
  )
}
