import { Container } from '@/components/ui/Container'
import { Media, type MediaImage, type MediaSlot } from '@/components/ui/Media'
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

// The image box per breakpoint, matching the Media classes below. Full container width below xl
// (viewport minus 16 / 32 gutters). From xl it spans 2 of 3 tracks with 32px gaps in a container of viewport - 128,
// capped at 1440: 2(C - 64)/3 + 32. Its height is the row's, at least 458 (`xl:min-h-114.5`) and in practice set by
// the form column (about 520-545 with the current copy), so 560 is used to cover a slightly longer form.
const IMAGE_SLOT: MediaSlot = {
  base: { w: '100vw - 32px', aspect: 4 / 3 },
  md: { w: '100vw - 64px', aspect: 3 / 2 },
  xl: { w: '66.67vw - 96px', h: 560 },
  page: { w: '864px', h: 560 },
}

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
            slot={IMAGE_SLOT}
            className="aspect-4/3 md:aspect-3/2 xl:col-span-2 xl:aspect-auto xl:min-h-114.5"
          />
        )}
      </Container>
    </section>
  )
}
