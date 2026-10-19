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
// at 3:2 from md: × (16/9) / (3/2) ≈ 1.19 → 120vw. From lg 7 of 12 columns (≤ 752 wide) as high as the form
// column, so the height decides: from xl the form is ≤ 545 high with today's copy, 545 × 16/9 ≈ 969 → 960px;
// at 1024–1279 the narrower form wraps to about 521: 521 × 16/9 ≈ 926 → 960px.
const IMAGE_SIZES = '(min-width: 64rem) 960px, (min-width: 48rem) 120vw, 134vw'

/**
 * Home "Stay informed": a form column (heading, options, text, email field) and an image.
 * Stacked below lg, form first. From lg a 12-column grid: the form spans 5 columns and the image 7,
 * stretched to the form's height with no minimum of its own.
 * UI only, nothing is sent: the client form validates and shows the errors, see NewsletterSignup.client.
 */
export function NewsletterSignup({ image, ...form }: NewsletterSignupProps) {
  if (form.options.length === 0) {
    return null
  }

  return (
    <section className="py-section lg:pt-section-lg">
      <Container className="grid gap-7 md:gap-10 lg:grid-cols-12 lg:gap-8">
        <NewsletterForm {...form} />

        {image && (
          <Media
            image={image}
            sizes={IMAGE_SIZES}
            className="aspect-4/3 md:aspect-3/2 lg:col-span-7 lg:aspect-auto"
          />
        )}
      </Container>
    </section>
  )
}
