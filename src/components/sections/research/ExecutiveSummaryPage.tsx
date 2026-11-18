import { RichText } from '@/components/sections/article/ArticleBody'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Heading } from '@/components/ui/Heading'
import { KeyFindings } from '@/components/ui/KeyFindings'
import { Meta } from '@/components/ui/Meta'
import { SplitSection } from '@/components/ui/SplitSection'
import type { ExecutiveSummaryView } from '@/lib/research-report'

// Screen-reader-only text. Visible copy comes from the CMS.
const INTRO_LABEL = 'Introduction'

// Side padding: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// A section below the header: 40px (mobile) or 64px below the previous one, a rule, then 40px above its content.
const SECTION = 'mx-gutter mt-10 border-t border-border pt-10 md:mt-16 header:mx-16'

// Section headings 20/24.
const HEADING = 'text-title-lg font-medium'

/**
 * A research report's Executive Summary page (/resource/{slug}/{summary slug}), ClearView only, as Claude Design
 * wb-g-research-executive-summary v1.0. Full width, no rail or banners. Header: breadcrumb, then from the header
 * breakpoint the type label and title on 5 of 12 columns beside the report details (Report / Edition / Date / Research
 * partner) on 7; stacked below it. Then the introduction (20/28 lead and grey paragraphs on 8 columns), one 5 | 7
 * split section per heading, Key takeaways (the report's key findings) and the link back to the report, each under a
 * rule. Each part without content is left out.
 */
export function ExecutiveSummaryPage({ view }: { view: ExecutiveSummaryView }) {
  return (
    <main className="mx-auto w-full max-w-page pb-16 md:pb-20">
      <header className={`flex flex-col gap-6 ${PAD} pt-8 md:pt-10`}>
        <Breadcrumb items={view.breadcrumb} />
        <div className="grid items-start gap-6 header:grid-cols-12 header:gap-8">
          <div className="flex min-w-0 flex-col gap-4 header:col-span-5 header:pr-6">
            {view.typeLabel && <Meta items={[view.typeLabel]} className="leading-none" />}
            <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{view.title}</h1>
          </div>
          {view.details.length > 0 && (
            // report-metadata-list `plain`: 24px above the first row.
            <DefinitionList items={view.details} variant="plain" className="pt-6 header:col-span-7" />
          )}
        </div>
      </header>

      {(view.lead || view.intro) && (
        <section aria-label={INTRO_LABEL} className={`${SECTION} grid items-start gap-6 header:grid-cols-12 header:gap-8`}>
          <div className="flex min-w-0 flex-col gap-4 header:col-span-8">
            {view.lead && <RichText value={view.lead} size="lg" spacing="tight" className="text-foreground" />}
            {view.intro && (
              <RichText value={view.intro} spacing="tight" className="text-base leading-copy text-pretty text-grey" />
            )}
          </div>
        </section>
      )}

      {view.sections.map((section) => (
        <SplitSection
          key={section.key}
          aria-labelledby={section.heading ? `section-${section.key}` : undefined}
          className={SECTION}
          heading={
            section.heading && (
              <h2 id={`section-${section.key}`} className={HEADING}>
                {section.heading}
              </h2>
            )
          }
        >
          {section.body && (
            <RichText
              value={section.body}
              spacing="tight"
              className="text-base leading-copy text-pretty text-foreground"
            />
          )}
        </SplitSection>
      ))}

      {view.keyTakeaways && (
        <section
          aria-labelledby={view.keyTakeaways.heading ? 'key-takeaways-heading' : undefined}
          className={`${SECTION} flex flex-col gap-6`}
        >
          {view.keyTakeaways.heading && (
            <Heading as={view.keyTakeaways.heading.as} id="key-takeaways-heading" className={HEADING}>
              {view.keyTakeaways.heading.text}
            </Heading>
          )}
          <KeyFindings items={view.keyTakeaways.items} headingAs={view.keyTakeaways.heading?.as} />
        </section>
      )}

      <div className={`${SECTION} flex`}>
        <ArrowLink href={view.back.href} variant="accent" hover="fade">
          {view.back.label}
        </ArrowLink>
      </div>
    </main>
  )
}
