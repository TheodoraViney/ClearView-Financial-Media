import { RichText, type RichTextValue } from '@/components/sections/article/ArticleBody'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
import { type HeadingValue } from '@/sanity/heading'

/**
 * Photo beside text with one figure (design wb-g-about v1.1 "industry record"), 48 / 64 / 80 above and below, under a
 * top rule with 32 (mobile) / 40 above and 40 below from md.
 * - From the header breakpoint (1200): 12 columns, gap 32; the photo in columns 1–7, 440 high; the text in columns 8–12
 *   (40 right padding) with the figure pinned to the bottom (spacer at least 40).
 * - Below: stacked, gap 32 / 40; the photo at 4:3 on mobile and 8:5 on tablet.
 * The figure: a top rule, 24 above and below, value in the accent at the section heading size, label grey (gap 8).
 */
export function RecordFeature({
  headingId,
  heading,
  text,
  image,
  figureValue,
  figureLabel,
}: {
  headingId: string
  heading: HeadingValue | null
  text: RichTextValue | null
  image: MediaImage | null
  figureValue: string
  figureLabel: string
}) {
  return (
    <Container className="py-12 md:py-16 header:px-16 header:py-20">
      <section
        aria-labelledby={heading ? headingId : undefined}
        className="grid gap-8 border-t border-border pt-8 md:gap-10 md:py-10 header:grid-cols-12 header:gap-8"
      >
        {/*
          sizes, height × 16/9 where the box crops the photo at the sides: from 1200 columns 1–7 are 752 wide at the
          1440 frame and 440 high → 440 × 16/9 ≈ 782px. Tablet 8:5 → 1.11 × the width; mobile 4:3 → 1.33 × the width.
        */}
        {image && (
          <Media
            image={image}
            sizes="(min-width: 75rem) 782px, (min-width: 48rem) 112vw, 134vw"
            placeholder={false}
            className="aspect-4/3 w-full bg-surface-thumb md:aspect-8/5 header:col-span-7 header:aspect-auto header:h-110"
          />
        )}

        <div className="flex min-w-0 flex-col header:col-span-5 header:col-start-8">
          {heading && (
            <Heading as={heading.as} id={headingId} className="text-heading-section font-medium text-pretty header:pr-10">
              {heading.text}
            </Heading>
          )}
          {text && <RichText value={text} className="py-6 header:pr-10" />}
          <div aria-hidden="true" className="flex-auto header:min-h-10" />
          {figureValue && (
            <p className="flex flex-col gap-2 border-t border-border py-6">
              <span className="text-heading-section font-medium text-accent">{figureValue}</span>
              {figureLabel && <span className="text-base leading-copy text-grey">{figureLabel}</span>}
            </p>
          )}
        </div>
      </section>
    </Container>
  )
}
