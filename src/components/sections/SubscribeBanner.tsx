import { Heading } from '@/components/ui/Heading'
import { type HeadingLevel } from '@/lib/headings'

import { SubscribeButton } from './subscribe/SubscribeButton.client'

export type SubscribeBannerProps = {
  heading: { as: HeadingLevel; text: string } | null
  description: string | null
  buttonLabel: string | null
}

/**
 * Publication "Subscribe banner" (shared-shell `stay-informed`): a bordered box with the H2, the description (max 520)
 * and one filled button. From 1200 three columns, the button at the end (40 high); below one column, the button at the
 * start (44 high), full width on mobile. Box padding 40 48 / 40 32 / 32 24; section 24 above, 72 / 64 / 48 below.
 * The button opens the subscribe pop-up.
 */
export function SubscribeBanner({ heading, description, buttonLabel }: SubscribeBannerProps) {
  if (!heading && !description && !buttonLabel) {
    return null
  }

  return (
    <section className="mx-auto w-full max-w-page px-side-lower pt-6 pb-12 md:pb-16 header:pb-18">
      <div className="grid items-center gap-6 rounded-sm border border-border bg-background px-6 py-8 md:px-8 md:py-10 header:grid-cols-3 header:gap-8 header:px-12">
        {heading && (
          <Heading as={heading.as} className="min-w-0 text-heading-section font-medium text-pretty text-foreground">
            {heading.text}
          </Heading>
        )}
        {description && <p className="max-w-130 min-w-0 text-base text-pretty text-grey">{description}</p>}
        {buttonLabel && (
          <SubscribeButton
            size="compact"
            motion="out"
            className="max-w-full min-w-0 px-4.5 text-center font-medium md:justify-self-start header:justify-self-end"
          >
            {buttonLabel}
          </SubscribeButton>
        )}
      </div>
    </section>
  )
}
