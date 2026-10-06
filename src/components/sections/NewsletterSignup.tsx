import { Container } from '@/components/ui/Container'
import { Media } from '@/components/ui/Media'
import { type HeadingLevel } from '@/lib/headings'

import { NewsletterForm } from './NewsletterSignup.client'

export type NewsletterOption = {
  key: string
  label: string
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
  image: { src: string; alt: string } | null
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
            src={image.src}
            alt={image.alt}
            sizes="(min-width: 90rem) 864px, (min-width: 80rem) 60vw, 100vw"
            className="aspect-4/3 md:aspect-3/2 xl:col-span-2 xl:aspect-auto xl:min-h-114.5"
          />
        )}
      </Container>
    </section>
  )
}
