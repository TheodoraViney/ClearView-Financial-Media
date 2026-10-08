import { Container } from '@/components/ui/Container'

import { FooterCopy } from './FooterCopy'
import { FooterLogo } from './FooterLogo'
import { FooterNav } from './FooterNav'
import type { FooterProps } from './types'

/**
 * ClearView group footer, as the clearview-footer master. Stacked below the `header` breakpoint;
 * from it the brand column (logo top, copy bottom) sits beside the auto-fit link grid, pushed right.
 */
export function GroupFooter({ logo, description, columns, socialHeading, social, copyright }: FooterProps) {
  return (
    <footer className="mt-auto bg-white">
      <Container className="flex flex-col gap-10 py-12 md:gap-12 md:py-16 header:flex-row header:flex-wrap header:gap-6 header:px-16 header:py-20">
        {/* Scroll reveal 0 on every breakpoint, as both design files; the link columns reveal from the desktop layout only (FooterNav). */}
        <div
          data-reveal
          className="flex shrink-0 flex-col items-start gap-6 scroll-reveal-0 header:min-w-70 header:shrink header:basis-footer-brand header:justify-between header:gap-8"
        >
          <FooterLogo logo={logo} />
          <FooterCopy
            description={description}
            copyright={copyright}
            className="max-w-130 gap-2 header:max-w-none header:gap-3"
          />
        </div>
        <FooterNav variant="group" columns={columns} socialHeading={socialHeading} social={social} />
      </Container>
    </footer>
  )
}
