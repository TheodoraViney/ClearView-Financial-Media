import Image from 'next/image'
import { type ReactNode } from 'react'

import { RichText } from '@/components/sections/article/ArticleBody'
import { MostRead } from '@/components/sections/MostRead'
import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { CategoryTag } from '@/components/ui/CategoryTag'
import { cx } from '@/components/ui/cx'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Heading } from '@/components/ui/Heading'
import { KeyFindings } from '@/components/ui/KeyFindings'
import { isSvg } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { ResearchCard } from '@/components/ui/ResearchCard'
import { ResearchChartCard } from '@/components/ui/ResearchChartCard'
import { ResearchPartnerCard } from '@/components/ui/ResearchPartnerCard'
import { SectionNav } from '@/components/ui/SectionNav.client'
import { SplitSection } from '@/components/ui/SplitSection'
import type { HeadingView } from '@/lib/awards-programme'
import { adPositionLabel } from '@/lib/gam'
import type { ResearchReportView } from '@/lib/research-report'

// Screen-reader-only text. Visible copy comes from the CMS.
const NAV_LABEL = 'Report sections'
const CONTRIBUTORS_LABEL = 'Report authors and participants'

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// The same inset as a margin, for sections whose top rule spans the content width only.
const INSET = 'mx-gutter header:mx-16'

// A main column section: 64px below the previous one, a rule, then 40px above its heading. The first section after
// the nav sits 40px below it with no rule (the executive summary in the design; as on the awards and event pages).
const SECTION = `${INSET} mt-16 border-t border-border pt-10 first:mt-10 first:border-t-0 first:pt-0`

// A section without a top rule (executive summary, research partner card): 64px below the previous one, 40 when first.
const PLAIN_SECTION = `${INSET} mt-16 first:mt-10`

// Section headings 20/24.
const HEADING = 'text-title-lg font-medium'

// Body copy 16/22.4.
const TEXT = 'text-base leading-copy text-pretty text-foreground'

// The hero cover is 400px high; its width follows the cover, at most the column.
const COVER_HEIGHT = 400

/**
 * The research report page (/resource/{slug}), ClearView only, as Claude Design wb-g-research-report v1.1. The shell is
 * the event page's: from the header breakpoint the main column beside a 364px right rail, below it the rail under the
 * column. Main column: Top banner, breadcrumb, the hero (type label, title, edition | date, standfirst and the
 * Download button on 5 of 12 columns, the cover on a grey surface on 7; stacked below the header breakpoint), the
 * sticky section navigation, then Executive summary (5 | 7 split), Key findings, Contributors / methodology,
 * Charts and selected insights (chart cards, then the numbered insights), Research partner and Related research. Rail: Side
 * banner (static), then Most read (titles only), which sticks 32px under the header on desktop. Each part without
 * content is left out with its navigation link.
 */
export function ResearchReportPage({ view }: { view: ResearchReportView }) {
  const { summary, keyFindings, methodology, insights, researchPartner, relatedResearch, mostRead } = view
  const hasMethodology = Boolean(methodology && (methodology.intro || methodology.rows.length > 0))
  const edition: ReactNode[] = [
    ...(view.edition ? [view.edition] : []),
    ...(view.date && view.publishedAt ? [<time key="date" dateTime={view.publishedAt}>{view.date}</time>] : []),
  ]

  return (
    <main className="mx-auto w-full max-w-page header:grid header:grid-cols-article">
      {/* The column divider is the main column's right border: on the rail it would take 1px of the 300px banner. */}
      <div className="flex min-w-0 flex-col pb-16 header:border-r header:border-border">
        {/* Hidden with its spacing where the column is too narrow for a leaderboard (`AD_SLOT_FITS`), or with no unit. */}
        <div className={cx(`@container ${PAD}`, !view.ads.top && AD_SLOT_UNSET)}>
          <div
            role="complementary"
            aria-label="Advertisement, top"
            className={cx('pt-6 md:pt-10', view.ads.top && AD_SLOT_FITS.leaderboard)}
          >
            <AdSlot size="leaderboard" unit={view.ads.top} label={adPositionLabel('top')} />
          </div>
        </div>

        <header className={`flex flex-col gap-10 ${PAD} pt-8 md:pt-10`}>
          <Breadcrumb items={view.breadcrumb} darkLast />
          {/* From the header breakpoint 12 columns (gap 32): the text in 5 with 24px to spare, at least 520 high so the
              standfirst and button sit at the cover's foot; the cover surface in 7. Stacked 24 apart below it. */}
          <div className="grid gap-6 header:grid-cols-12 header:gap-8">
            <div
              className={cx(
                'flex min-w-0 flex-col',
                view.cover ? 'header:col-span-5 header:min-h-130 header:pr-6' : 'header:col-span-12',
              )}
            >
              <div className="flex flex-col gap-4">
                {view.typeLabel && <Meta items={[view.typeLabel]} className="leading-none" />}
                <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{view.title}</h1>
                {edition.length > 0 && <Meta items={edition} className="leading-none" />}
              </div>
              {(view.standfirst || view.download) && (
                <>
                  {/* At least 40 between the title block and the standfirst; on desktop it takes the spare height. */}
                  <div aria-hidden="true" className="min-h-10 grow" />
                  <div className="flex flex-col gap-6">
                    {view.standfirst && <p className="text-base leading-copy text-pretty text-grey">{view.standfirst}</p>}
                    {view.download && (
                      // primary-button: 44 then 40 from the header breakpoint, 20px sides, 16px download icon; full
                      // width on mobile.
                      <Button
                        href={view.download.href}
                        newTab
                        icon="download-tray"
                        padding="wide"
                        size="compact"
                        className="w-full self-start md:w-auto"
                      >
                        {view.download.label}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            {view.cover && (
              <div className="flex min-h-130 min-w-0 items-center justify-center rounded-sm bg-surface-thumb header:col-span-7">
                <Image
                  src={view.cover.src}
                  alt={view.cover.alt || view.title}
                  width={Math.round((COVER_HEIGHT * view.cover.width) / view.cover.height)}
                  height={COVER_HEIGHT}
                  unoptimized={isSvg(view.cover.src)}
                  loading="eager"
                  fetchPriority="high"
                  // 400px high, as wide as the cover's ratio allows (about 285 for an A4 cover), at most the column.
                  sizes={`${Math.min(Math.ceil((COVER_HEIGHT * view.cover.width) / view.cover.height), 1024)}px`}
                  className="block h-100 w-auto max-w-full rounded-sm object-contain shadow-cover-lg"
                />
              </div>
            )}
          </div>
        </header>

        {view.nav.length > 0 && (
          // Sticks under the sticky site header (z-40), above the page content, as on the awards and event pages.
          <div className={`sticky top-header z-30 mt-8 bg-white md:mt-10 ${PAD}`}>
            <SectionNav items={view.nav} label={NAV_LABEL} />
          </div>
        )}

        <div>
          {summary && (
            <SplitSection
              id="executive-summary"
              data-section-anchor
              aria-labelledby={summary.heading ? 'executive-summary-heading' : undefined}
              className={PLAIN_SECTION}
              heading={<SectionHeading heading={summary.heading} id="executive-summary-heading" />}
            >
              {summary.text && <RichText value={summary.text} spacing="tight" className={TEXT} />}
              {summary.fullSummary && (
                <div className="flex pt-2">
                  <ArrowLink href={summary.fullSummary.href} variant="accent" hover="fade">
                    {summary.fullSummary.label}
                  </ArrowLink>
                </div>
              )}
            </SplitSection>
          )}

          {keyFindings && (
            <Section id="key-findings" heading={keyFindings.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  <KeyFindings items={keyFindings.items} headingAs={keyFindings.heading?.as} />
                </>
              )}
            </Section>
          )}

          {methodology && (
            <Section
              id="contributors-methodology"
              heading={methodology.heading}
              className={cx(SECTION, 'flex flex-col gap-6')}
            >
              {(heading) => (
                <>
                  {heading}
                  {/* Methodology and contributors side by side from md (gap 32), stacked below it. Without a
                      methodology the contributors take the full width. */}
                  <div className={cx('grid items-start gap-8', hasMethodology && 'md:grid-cols-2')}>
                    {hasMethodology && (
                      <div className="flex min-w-0 flex-col">
                        {methodology.intro && (
                          <RichText
                            value={methodology.intro}
                            spacing="tight"
                            className={cx(TEXT, methodology.rows.length > 0 && 'border-b border-border pb-6')}
                          />
                        )}
                        {methodology.rows.length > 0 && (
                          <DefinitionList
                            items={methodology.rows}
                            variant="plain"
                            className={methodology.intro ? 'pt-6' : undefined}
                          />
                        )}
                      </div>
                    )}
                    {methodology.contributors.length > 0 && (
                      // report-contributors: name chips, 12 apart; two a row from md beside the methodology, four a
                      // row from the header breakpoint when they have the full width.
                      <ul
                        aria-label={CONTRIBUTORS_LABEL}
                        className={cx('grid min-w-0 gap-3 md:grid-cols-2', !hasMethodology && 'header:grid-cols-4')}
                      >
                        {methodology.contributors.map((person) => (
                          <li key={person.key} className="flex min-w-0">
                            <CategoryTag label={person.name} size="lg" className="w-full" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </Section>
          )}

          {insights && (
            <Section id="charts-insights" heading={insights.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  {insights.charts.length > 0 && (
                    // chart-grid: two a row from md, one below, 32 apart. Always half-width tracks, so one or three
                    // cards keep the design's card proportions instead of stretching a gauge card across the column.
                    <ul className="grid gap-8 md:grid-cols-2">
                      {insights.charts.map((chart) => (
                        <li key={chart.key} className="flex min-w-0 flex-col">
                          <ResearchChartCard chart={chart} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {insights.items.length > 0 && (
                    // selected-insights: an h3 over a rule, then numbered items 3 / 2 / 1 a row, 24 down, 32 across;
                    // 40 under the charts (the section's 24 plus 16).
                    <div className={cx('flex min-w-0 flex-col gap-6', insights.charts.length > 0 && 'pt-4')}>
                      {insights.subheading && (
                        <Heading
                          as={insights.subheading.as}
                          className="border-b border-border pb-4 text-base leading-title font-medium"
                        >
                          {insights.subheading.text}
                        </Heading>
                      )}
                      <ol className="grid gap-x-8 gap-y-6 md:grid-cols-2 header:grid-cols-3">
                        {insights.items.map((item, index) => (
                          <li key={index} className="grid min-w-0 grid-cols-insight items-baseline gap-3">
                            <span aria-hidden className="text-base leading-copy font-medium text-accent tabular-nums">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className={TEXT}>{item}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {researchPartner && (
            <section
              id="research-partner"
              data-section-anchor
              aria-labelledby={researchPartner.heading ? 'research-partner-heading' : undefined}
              className={PLAIN_SECTION}
            >
              <ResearchPartnerCard
                heading={<SectionHeading heading={researchPartner.heading} id="research-partner-heading" />}
                name={researchPartner.name}
                description={researchPartner.description}
                link={researchPartner.profile}
                logo={researchPartner.logo}
              />
            </section>
          )}

          {relatedResearch && (
            <Section id="related-research" heading={relatedResearch.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  {/* Three a row from the header breakpoint, two from md, one below, 32 apart. */}
                  <ul className="grid gap-8 md:grid-cols-2 header:grid-cols-3">
                    {relatedResearch.items.map((item) => (
                      <li key={item.key} className="flex min-w-0 flex-col">
                        <ResearchCard
                          href={item.href}
                          title={item.title}
                          cover={item.cover}
                          meta={[
                            ...(view.typeLabel ? [view.typeLabel] : []),
                            ...(item.date && item.publishedAt
                              ? [<time key="date" dateTime={item.publishedAt}>{item.date}</time>]
                              : []),
                          ]}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>
          )}
        </div>
      </div>

      <aside
        aria-label="Sidebar"
        className="flex flex-col items-start gap-8 border-t border-border px-gutter pt-10 pb-16 header:border-t-0 header:p-8"
      >
        {/* The sidebar is already a complementary landmark: its banner gets no landmark of its own. */}
        <div className={cx('w-full', !view.ads.side && AD_SLOT_UNSET)}>
          <AdSlot size="mpu" unit={view.ads.side} label={adPositionLabel('side')} />
        </div>
        {mostRead?.heading && (
          // Only the list sticks, 32px under the header on desktop (most-read in the design); the banner stays.
          <div className="w-full header:sticky header:top-rail header:w-75">
            <MostRead
              title={mostRead.heading.text}
              headingAs={mostRead.heading.as}
              items={mostRead.items}
              showMeta={false}
            />
          </div>
        )}
      </aside>
    </main>
  )
}

/** A section heading from a heading field (20/24), labelling its section. */
function SectionHeading({ heading, id }: { heading: HeadingView; id: string }) {
  return heading ? (
    <Heading as={heading.as} id={id} className={HEADING}>
      {heading.text}
    </Heading>
  ) : null
}

/**
 * A section the section navigation links to (`data-section-anchor` lands it below the sticky nav), labelled by its
 * CMS heading when it has one. `children` places the heading.
 */
function Section({
  id,
  heading,
  className,
  children,
}: {
  id: string
  heading: HeadingView
  className?: string
  children: (heading: ReactNode) => ReactNode
}) {
  return (
    <section id={id} data-section-anchor aria-labelledby={heading ? `${id}-heading` : undefined} className={className}>
      {children(<SectionHeading heading={heading} id={`${id}-heading`} />)}
    </section>
  )
}
