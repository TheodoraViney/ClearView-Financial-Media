import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { type HeadingValue } from '@/sanity/heading'

import { AnchorScroll } from './AnchorScroll.client'
import { EnquiryFormFields, type EnquiryFormFieldsProps } from './EnquiryForm.client'

/**
 * "Start a conversation": a bordered `surface-subtle` panel (radius 4, padding 24 / 40), 64 / 80 above and below
 * (it closes the page). From 1200 a 12-column grid, gap 32: heading in columns 1–3, form in 5–12; below, stacked, gap
 * 24. The section carries the anchor id the page's `#id` links scroll to, and `tabIndex={-1}` so focus follows.
 */
export function EnquiryForm({
  anchorId,
  heading,
  ...form
}: {
  anchorId: string
  heading: HeadingValue | null
} & EnquiryFormFieldsProps) {
  const headingId = `${anchorId}-heading`

  return (
    <Container className="mt-16 pb-16 md:mt-20 md:pb-20 header:px-16">
      <section id={anchorId} tabIndex={-1} aria-labelledby={heading ? headingId : undefined} className="outline-none">
        <AnchorScroll targetId={anchorId} />

        <div className="grid items-start gap-6 rounded-sm border border-border bg-surface-subtle p-6 md:p-10 header:grid-cols-12 header:gap-8">
          {heading && (
            <Heading
              as={heading.as}
              id={headingId}
              className="min-w-0 text-heading-section font-medium text-balance header:col-span-3"
            >
              {heading.text}
            </Heading>
          )}

          <div className="min-w-0 header:col-span-8 header:col-start-5">
            <EnquiryFormFields {...form} labelledBy={heading ? headingId : undefined} />
          </div>
        </div>
      </section>
    </Container>
  )
}
