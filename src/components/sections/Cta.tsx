import { RichText, type RichTextValue } from '@/components/sections/article/ArticleBody'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { type HeadingValue } from '@/sanity/heading'

/**
 * Contact panel (design wb-g-about v1.1 "contact"), 48 / 64 / 80 above and below: a `dark-blue-grey` panel, 4px radius,
 * padding 24 / 40.
 * - From the header breakpoint (1200): 12 columns, gap 32, centred; heading in columns 1–5, text and button in columns
 *   6–12 (gap 32, spread apart).
 * - Below: stacked, gap 24; text and button side by side from md (gap 32), stacked on mobile (gap 24).
 * Text white/70, at most 440 wide. Button `filled-light` (white, `border` on hover, 180ms ease-out); `compact` keeps
 * the 44px touch target below 1200 (the design draws 40 everywhere). White focus outline on the dark panel.
 */
export function Cta({
  headingId,
  heading,
  text,
  button,
}: {
  headingId: string
  heading: HeadingValue | null
  text: RichTextValue | null
  button: { href: string; label: string } | null
}) {
  return (
    <Container className="py-12 md:py-16 header:px-16 header:py-20">
      <section
        aria-labelledby={heading ? headingId : undefined}
        className="grid items-center gap-6 rounded-sm bg-dark-blue-grey p-6 md:p-10 header:grid-cols-12 header:gap-8"
      >
        {heading && (
          <Heading
            as={heading.as}
            id={headingId}
            className="min-w-0 text-heading-section font-medium text-pretty text-white header:col-span-5"
          >
            {heading.text}
          </Heading>
        )}

        <div className="flex min-w-0 flex-col items-start justify-between gap-6 md:flex-row md:items-center md:gap-8 header:col-span-7 header:col-start-6">
          {text && <RichText value={text} className="max-w-110 text-white/70" />}
          {button && (
            <Button
              href={button.href}
              variant="filled-light"
              size="compact"
              padding="wide"
              motion="out"
              className="focus-visible:outline-white"
            >
              {button.label}
            </Button>
          )}
        </div>
      </section>
    </Container>
  )
}
