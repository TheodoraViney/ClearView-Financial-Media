import Image from 'next/image'
import { type ReactNode } from 'react'

import { RichText } from '@/components/sections/article/ArticleBody'
import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { cx } from '@/components/ui/cx'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Heading } from '@/components/ui/Heading'
import { KeyFindings } from '@/components/ui/KeyFindings'
import { LinkRow } from '@/components/ui/LinkRow'
import { isSvg, Media } from '@/components/ui/Media'
import type { HeadingView } from '@/lib/awards-programme'
import { adPositionLabel } from '@/lib/gam'
import type { PartnerHeroPanel, PartnerProfileView, RecognitionView } from '@/lib/partner-profile'

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// The same inset as a margin, so a section's top rule spans the content width only.
const INSET = 'mx-gutter header:mx-16'

// A section 64px below the previous one (At a glance, Clients and platform).
const PLAIN_SECTION = `${INSET} mt-16`

// A section 64px below the previous one, with a rule and 40px above its heading (activity, coverage, official links).
const RULED_SECTION = `${INSET} mt-16 border-t border-border pt-10`

// Section headings 20/24, sub-headings 16/20.8.
const HEADING = 'text-title-lg font-medium'
const SUBHEADING = 'text-base leading-title font-medium'

// Body copy 16/22.4.
const TEXT = 'text-base leading-copy text-pretty text-foreground'

/**
 * The partner profile page (/companies/{slug}), ClearView only, as Claude Design wb-g-partner-profile v1.0. The shell is
 * the research report's: from the header breakpoint the main column beside a 364px right rail, below it the rail under
 * the column. Main column: Top banner, breadcrumb, the header (type label, name, description and website link on 5 of
 * 12 columns, the image / logo / name panel on 7; stacked below the header breakpoint), then At a glance, Clients and
 * platform, Activity and recognition, Sponsor and editorial coverage and Official links, each left out without content.
 * Rail: Side banner, sticky 32px under the header on desktop, static below.
 */
export function PartnerProfilePage({ view }: { view: PartnerProfileView }) {
  const { metrics, fields, activity, coverage, officialLinks } = view

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

        <header className={`flex flex-col gap-6 ${PAD} pt-8 md:pt-10`}>
          <Breadcrumb items={view.breadcrumb} />
          <PartnerProfileHero view={view} />
        </header>

        {metrics && (
          <section aria-label={metrics.label} className={PLAIN_SECTION}>
            <KeyFindings items={metrics.items} variant="metrics" />
          </section>
        )}

        {fields && (
          <Section id="partner-fields" heading={fields.heading} className={cx(PLAIN_SECTION, 'flex flex-col gap-6')}>
            <DefinitionList items={fields.rows} variant="fields" />
          </Section>
        )}

        {activity && (
          <Section id="activity-recognition" heading={activity.heading} className={cx(RULED_SECTION, 'flex flex-col gap-6')}>
            <Columns both={Boolean(activity.sponsor && activity.recognition)}>
              {activity.sponsor && (
                <SubSection heading={activity.sponsor.heading}>
                  <ul className="flex flex-col gap-3">
                    {activity.sponsor.items.map((item) => (
                      <li key={item.key} className={cx('min-w-0', TEXT)}>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </SubSection>
              )}
              {activity.recognition && (
                <SubSection heading={activity.recognition.heading}>
                  <Recognition items={activity.recognition.items} />
                </SubSection>
              )}
            </Columns>
          </Section>
        )}

        {coverage && (
          <Section
            id="sponsor-editorial-coverage"
            heading={coverage.heading}
            className={cx(RULED_SECTION, 'flex flex-col gap-6')}
          >
            <Columns both={Boolean(coverage.interviews && coverage.archive)}>
              {coverage.interviews && (
                <SubSection heading={coverage.interviews.heading}>
                  <div className="flex flex-col">
                    {coverage.interviews.items.map((item) => (
                      <LinkRow key={item.key} href={item.href} label={item.label} chevronAlign="top" />
                    ))}
                  </div>
                </SubSection>
              )}
              {coverage.archive && (
                <SubSection heading={coverage.archive.heading}>
                  <ul className="flex flex-col gap-3">
                    {coverage.archive.titles.map((title, index) => (
                      <li key={index} className={cx('min-w-0', TEXT)}>
                        {title}
                      </li>
                    ))}
                  </ul>
                  {/* 8px more above the link than between the titles. */}
                  {coverage.archive.link && (
                    <div className="pt-2">
                      <LinkRow href={coverage.archive.link.href} label={coverage.archive.link.label} />
                    </div>
                  )}
                </SubSection>
              )}
            </Columns>
          </Section>
        )}

        {officialLinks && (
          <Section id="official-links" heading={officialLinks.heading} className={cx(RULED_SECTION, 'flex flex-col gap-6')}>
            <div className="flex flex-col">
              {officialLinks.items.map((item) => (
                <LinkRow key={item.key} href={item.href} label={item.label} />
              ))}
            </div>
          </Section>
        )}
      </div>

      <aside
        aria-label="Sidebar"
        className="flex flex-col items-start gap-8 border-t border-border px-gutter pt-10 pb-16 header:border-t-0 header:p-8"
      >
        {/* The sidebar is already a complementary landmark: its banner gets no landmark of its own. Sticky 32px under
            the header on desktop, static below. */}
        <div className={cx('w-full header:sticky header:top-rail header:w-75', !view.ads.side && AD_SLOT_UNSET)}>
          <AdSlot size="mpu" unit={view.ads.side} label={adPositionLabel('side')} />
        </div>
      </aside>
    </main>
  )
}

/**
 * partner-profile: from the header breakpoint 12 columns (gap 32), the text in 5 (at least 344 high, so the description
 * and link sit at the panel's foot) and the panel in 7, 344 high. Below it stacked 24 apart, the panel 360 high on
 * tablet and 220 on mobile. The website link keeps its 44px height below the header breakpoint, as the design.
 */
function PartnerProfileHero({ view }: { view: PartnerProfileView }) {
  const hasBottom = Boolean(view.description || view.website)

  return (
    <div className="grid gap-6 header:grid-cols-12 header:gap-8">
      <div className="flex min-w-0 flex-col header:col-span-5 header:min-h-86">
        <div className="flex flex-col gap-4">
          <span className="text-caption leading-none font-medium text-accent">{view.typeLabel}</span>
          <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{view.name}</h1>
        </div>
        {hasBottom && (
          <>
            {/* At least 40 between the name and the description; on desktop it takes the spare height. */}
            <div aria-hidden="true" className="min-h-10 grow" />
            <div className="flex flex-col gap-6">
              {view.description && (
                <RichText value={view.description} spacing="tight" className="text-base leading-copy text-pretty text-grey" />
              )}
              {view.website && (
                <ArrowLink href={view.website.href} variant="accent" hover="fade-tall" className="header:min-h-0">
                  {view.website.label}
                </ArrowLink>
              )}
            </div>
          </>
        )}
      </div>
      <HeroPanel panel={view.panel} />
    </div>
  )
}

const PANEL = 'h-55 min-w-0 rounded-sm md:h-90 header:col-span-7 header:h-86'

/**
 * The header panel: the profile image filling a grey surface; else the logo at its own size (capped by the panel) on a white panel with a 1px
 * border and 32px inside; else the company name set as a 36/36 text lockup on that panel.
 */
function HeroPanel({ panel }: { panel: PartnerHeroPanel }) {
  if (panel.kind === 'image') {
    return (
      <Media
        image={panel.image}
        placeholder={false}
        priority
        // 7 of 12 columns of the main column from the header breakpoint (at most about 560px at 1440), full width below.
        sizes="(min-width: 75rem) 560px, 100vw"
        className={cx(PANEL, 'bg-surface-thumb')}
      />
    )
  }

  return (
    <div className={cx(PANEL, 'flex items-center justify-center overflow-hidden border border-border bg-white p-8')}>
      {panel.kind === 'logo' ? (
        // The logo at its own size, scaled down only to fit the panel less its 32px padding (never scaled up).
        <Image
          src={panel.image.src}
          alt={panel.image.alt}
          width={panel.image.width}
          height={panel.image.height}
          unoptimized={isSvg(panel.image.src)}
          loading="eager"
          fetchPriority="high"
          // At most the panel's inner width (about 500px at 1440) and never wider than the file.
          sizes={`(min-width: 75rem) ${Math.min(panel.image.width, 500)}px, ${Math.min(panel.image.width, 1024)}px`}
          className="block size-auto max-h-full max-w-full object-contain"
        />
      ) : (
        <span role="img" aria-label={panel.label} className="flex max-w-full min-w-0 flex-col items-center text-center">
          <span aria-hidden="true" className="text-heading-fixed leading-none font-medium wrap-anywhere">
            {panel.name}
          </span>
        </span>
      )}
    </div>
  )
}

/** Recognition: one item per edition, its title, the year on a grey line, then the categories won as chips. */
function Recognition({ items }: { items: RecognitionView[] }) {
  return (
    <ul className="flex flex-col gap-6">
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 flex-col gap-3">
          <span className="flex flex-col gap-2">
            <span className={TEXT}>{item.title}</span>
            {item.year && <span className="text-caption leading-none text-grey">{item.year}</span>}
          </span>
          <ul aria-label={`${item.winsLabel} categories`} className="flex flex-wrap gap-2">
            {item.wins.map((win) => (
              <Badge key={win.key} as="li" layout="wrap">
                {win.label}
              </Badge>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

/** Two halves side by side on desktop (gap 32) when both have content; one column otherwise, 40 apart. */
function Columns({ both, children }: { both: boolean; children: ReactNode }) {
  return <div className={cx('grid items-start gap-10 header:gap-8', both && 'header:grid-cols-2')}>{children}</div>
}

/** A half of a section: its 16/20.8 sub-heading 16px above the content. */
function SubSection({ heading, children }: { heading: HeadingView; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {heading && (
        <Heading as={heading.as} className={SUBHEADING}>
          {heading.text}
        </Heading>
      )}
      {children}
    </div>
  )
}

/** A section labelled by its CMS heading (20/24) when it has one. */
function Section({
  id,
  heading,
  className,
  children,
}: {
  id: string
  heading: HeadingView
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={heading ? `${id}-heading` : undefined} className={className}>
      {heading && (
        <Heading as={heading.as} id={`${id}-heading`} className={HEADING}>
          {heading.text}
        </Heading>
      )}
      {children}
    </section>
  )
}
