import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Media, type MediaImage } from '@/components/ui/Media'
import { type HeadingValue } from '@/sanity/heading'

import { ContactFormFields, type ContactFormFieldsProps } from './ContactForm.client'

const HEADING_ID = 'contact-title'

/**
 * The Contact page (design wb-g-contact v1.2). Breadcrumb 32 / 40 from the top, the row 24 below it; 64 / 80 under
 * the row. Sides 16 / 32 / 64 (64 from 1200, as the design's own breakpoint).
 * - From 1200: 12 columns, gap 32. Columns 1–5 hold the H1 and standfirst and, 40 below, the image, which fills the
 *   height the error-free form leaves under the intro. The column has that fixed height (`h-contact-row`), so
 *   validation errors lengthen the form only and the image keeps its size. The form sits in columns 7–12, 16 from
 *   the top.
 * - Below: one column, 32 / 40 between rows, in the order intro (at most 640 wide), form, image (at most 320 wide,
 *   4:5). The left column dissolves (`contents`) so its two parts take their own rows.
 */
export function ContactForm({
  breadcrumb,
  heading,
  standfirst,
  image,
  ...form
}: {
  breadcrumb: BreadcrumbItem[]
  heading: HeadingValue | null
  standfirst: string
  image: MediaImage | null
} & ContactFormFieldsProps) {
  return (
    <Container className="pt-8 pb-16 md:pt-10 md:pb-20 header:px-16">
      <Breadcrumb items={breadcrumb} />

      <section
        aria-labelledby={heading ? HEADING_ID : undefined}
        className="mt-6 grid grid-cols-1 gap-y-8 md:gap-y-10 header:grid-cols-12 header:gap-x-8"
      >
        <div className="contents header:col-span-5 header:row-start-1 header:flex header:h-contact-row header:min-w-0 header:flex-col header:gap-10 header:self-start">
          <header className="flex min-w-0 max-w-160 flex-col gap-4 header:max-w-none">
            {heading && (
              <Heading as={heading.as} id={HEADING_ID} className="text-heading-section font-medium">
                {heading.text}
              </Heading>
            )}
            {standfirst && <p className="text-base leading-copy text-pretty text-grey">{standfirst}</p>}
          </header>

          {image && (
            <Media
              image={image}
              // Up to 320 below 1200; from it the five columns, 528 at 1440 (the box is taller than wide, the
              // portrait image fills its width).
              sizes="(min-width: 75rem) 33rem, 20rem"
              placeholder={false}
              className="row-start-3 aspect-4/5 w-full max-w-80 bg-surface-thumb header:aspect-auto header:min-h-0 header:max-w-none header:flex-1"
            />
          )}
        </div>

        <div className="row-start-2 min-w-0 header:col-span-6 header:col-start-7 header:row-start-1 header:self-start header:pt-4">
          <ContactFormFields {...form} labelledBy={heading ? HEADING_ID : undefined} />
        </div>
      </section>
    </Container>
  )
}
