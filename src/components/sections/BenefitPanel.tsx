import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
import { type HeadingLevel, HEADING_LEVELS } from '@/lib/headings'
import { type HeadingValue } from '@/sanity/heading'

export type BenefitPanelItem = { key: string; title: string; description: string }

// Benefit titles sit one level below the section heading (h3 under the design's h2), h6 at most.
const levelBelow = (level: HeadingLevel | undefined): HeadingLevel =>
  HEADING_LEVELS[Math.min(HEADING_LEVELS.indexOf(level ?? 'h2') + 1, HEADING_LEVELS.length - 1)]

/**
 * A panel over a decorative photo (alt=""), on `dark-blue-grey` while it loads: 64 / 80 above, padding 24 / 40, at least
 * 560 high on tablet and 640 from 1200. Heading at the top, benefits pinned to the bottom (spacer at least 40) in a
 * grid of 1 / 2 / 4 columns, gap 24 / 32.
 * Dividers in white/10 (the design's white/20 → the existing token): a right rule between columns from 1200, on
 * the left column on tablet, and a top rule between rows on mobile. Benefit text is white/50 as designed.
 */
export function BenefitPanel({
  headingId,
  heading,
  image,
  items,
}: {
  headingId: string
  heading: HeadingValue | null
  image: MediaImage | null
  items: BenefitPanelItem[]
}) {
  if (items.length === 0) {
    return null
  }

  const itemLevel = levelBelow(heading?.as)

  return (
    <Container className="mt-16 md:mt-20 header:px-16">
      <section
        aria-labelledby={heading ? headingId : undefined}
        className="relative flex flex-col overflow-hidden rounded-sm bg-dark-blue-grey p-6 md:min-h-140 md:p-10 header:min-h-160"
      >
        {/*
          sizes, upper bound per breakpoint: from 1200 the panel is wider than the photo's ratio, so its width bounds it
          (100vw). 768–1199: at most 1135 wide (1199 − 2 × 32), or 560 × 16/9 ≈ 1000 where the box crops at the sides:
          1200px. Below 768 the box is taller than wide and crops at the sides: ≈ 700 of stacked text × 16/9 ≈ 1250px.
          No placeholder: the panel's dark-blue-grey shows while the photo loads or if it fails.
        */}
        {image && (
          <div className="absolute inset-0">
            <Media
              image={image}
              sizes="(min-width: 75rem) 100vw, (min-width: 48rem) 1200px, 1250px"
              placeholder={false}
              className="size-full"
            />
          </div>
        )}

        {heading && (
          <Heading as={heading.as} id={headingId} className="relative text-heading-section font-medium text-balance text-white">
            {heading.text}
          </Heading>
        )}

        <div aria-hidden="true" className="relative min-h-10 flex-auto" />

        <ul className="relative grid gap-6 md:grid-cols-2 md:gap-8 header:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex min-w-0 flex-col justify-end gap-3 border-white/10 max-md:not-first:border-t max-md:not-first:pt-6 md:max-header:odd:border-r md:max-header:odd:pr-8 header:not-last:border-r header:not-last:pr-8"
            >
              <Heading as={itemLevel} className="text-title-lg font-medium text-pretty text-white">
                {item.title}
              </Heading>
              <p className="text-base leading-copy text-pretty text-white/50">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
