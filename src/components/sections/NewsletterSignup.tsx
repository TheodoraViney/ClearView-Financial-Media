import { Container } from '@/components/ui/Container'
import { Media, type MediaImage } from '@/components/ui/Media'
import { type HeadingLevel } from '@/lib/headings'

import { NewsletterForm } from './NewsletterSignup.client'

export type NewsletterOption = {
  key: string
  label: string
  defaultChecked: boolean
}

export type NewsletterSignupProps = {
  heading: { as: HeadingLevel; text: string } | null
  body: string
  preferencesLabel: string
  options: NewsletterOption[]
  emailPlaceholder: string
  buttonLabel: string
  invalidEmailMessage: string
  noOptionMessage: string
  image: MediaImage | null
}

// Image sizes, cropped at the sides of a 16:9 image everywhere. Full width at 4:3 on mobile: × 4/3 → 134vw;
// at 3:2 from md: × (16/9) / (3/2) ≈ 1.19 → 120vw. From xl two tracks (≤ 864 wide) as high as the form column,
// 520-545 with today's copy: 545 × 16/9 ≈ 969 → 960px (within 1.05, and 2x stays on the 1920 step, not 2048).
const IMAGE_SIZES = '(min-width: 80rem) 960px, (min-width: 48rem) 120vw, 134vw'

/**
 * Home "Stay informed": a form column (heading, options, text, email field) and an image.
 * Stacked below xl, form first. From xl a 3-track grid: the form takes one track and the image spans two,
 * filling the row height with a 458px minimum (the design's auto-fit would leave an empty cell at 1024–1279).
 * UI only, nothing is sent: the client form validates and shows the errors, see NewsletterSignup.client.
 */
export function NewsletterSignup({ image, ...form }: NewsletterSignupProps) {
  if (form.options.length === 0) {
    return null
  }

  return (
    <section className="py-section lg:pt-section-lg">
      <Container className="grid gap-7 md:gap-10 xl:grid-cols-3 xl:gap-8">
        <NewsletterForm {...form} />

        {image && (
          <Media
            image={image}
            sizes={IMAGE_SIZES}
            reveal
            className="scroll-reveal-1 aspect-4/3 md:aspect-3/2 xl:col-span-2 xl:aspect-auto xl:min-h-114.5"
          />
        )}
      </Container>
    </section>
  )
}
