import { Container } from '@/components/ui/Container'

import { FooterCopy } from './FooterCopy'
import { FooterLogo } from './FooterLogo'
import { FooterNav } from './FooterNav'
import type { FooterProps } from './types'

/**
 * Publication footer (WB, WBA, FWR), as the wb-g / wba / family-wealth-report footer masters:
 * top border, brand column with the publisher line, five equal columns beside it from the `header` breakpoint.
 */
export function PublicationFooter({
  logo,
  description,
  publisherLine,
  columns,
  socialHeading,
  social,
  copyright,
}: FooterProps & { publisherLine: string }) {
  return (
    <footer className="mt-auto border-t border-border bg-white">
      <Container className="flex flex-col gap-10 py-14 md:gap-12 md:py-16 header:flex-row header:gap-8 header:px-12 header:py-18">
        <div className="flex min-w-0 shrink-0 flex-col items-start gap-6 header:shrink header:basis-90">
          <FooterLogo logo={logo} />
          <FooterCopy
            description={description}
            publisherLine={publisherLine}
            copyright={copyright}
            className="max-w-90 gap-2"
          />
        </div>
        <FooterNav variant="publication" columns={columns} socialHeading={socialHeading} social={social} />
      </Container>
    </footer>
  )
}
