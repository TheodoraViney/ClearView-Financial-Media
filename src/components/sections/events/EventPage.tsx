import { Fragment, type ReactNode } from 'react'

import { RichText } from '@/components/sections/article/ArticleBody'
import { OtherProgrammes } from '@/components/sections/awards/OtherProgrammes'
import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { AgendaList } from '@/components/ui/AgendaList'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { cx } from '@/components/ui/cx'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Heading } from '@/components/ui/Heading'
import { LinkRow } from '@/components/ui/LinkRow'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { PartnerCard } from '@/components/ui/PartnerCard'
import { SectionNav } from '@/components/ui/SectionNav.client'
import { SpeakerCard } from '@/components/ui/SpeakerCard'
import type { HeadingView } from '@/lib/awards-programme'
import type { EventAgendaTrackView, EventPageView } from '@/lib/event-page'
import { adPositionLabel } from '@/lib/gam'

// Screen-reader-only text. Visible copy comes from the CMS.
const NAV_LABEL = 'Event sections'

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// The same inset as a margin, for sections whose top rule spans the content width only.
const INSET = 'mx-gutter header:mx-16'

// A main column section after the overview: 64px below the previous one, a rule, then 40px above its heading. Without an
// overview the first section takes the overview's place: 40px below the nav and no rule.
const SECTION = `${INSET} mt-16 border-t border-border pt-10 first:mt-10 first:border-t-0 first:pt-0`

// Dark body copy, 16/22.4 (why attend intro, the overview without an event format).
const TEXT = 'text-base leading-copy text-pretty text-foreground'

// The same at most 640 wide (the overview beside an event format, the agenda kept as text).
const COPY = `max-w-160 ${TEXT}`

// Section headings 20/24.
const HEADING = 'text-title-lg font-medium'

// Group subheadings (speaker types, agenda tracks, sponsor tiers) 16/20.8 500, as the awards judging panels.
const SUBHEADING = 'text-base leading-title font-medium'

// Three cards a row from the header breakpoint, two from md, one below, 32 apart.
const GRID = 'grid gap-8 md:grid-cols-2 header:grid-cols-3'

/**
 * The conference event page (one summit, briefing or webinar at /events/{slug}), ClearView only, as Claude Design
 * wb-g-event v1.2. The shell is the awards programme page's: from the header breakpoint the main column beside a 364px
 * right rail, below it the rail under the column. Main column: Top banner, breadcrumb, then the title row (type
 * label, title and status | date | venue | country beside the event logo on a dark box, stacked below the header
 * breakpoint; without a logo the text takes the row), the sticky section navigation, then Overview with the event
 * format, Speakers, Why attend, Agenda, Sponsors & partners, and Venue beside Related coverage (side by side from md).
 * Rail: Side banner, then Related events, which sticks 32px under the header on desktop. Each part without content is
 * left out, its heading and navigation link included.
 */
export function EventPage({ view }: { view: EventPageView }) {
  const meta = [view.date, view.venue, view.country].filter((item): item is string => Boolean(item))
  const { overview, speakers, whyAttend, agenda, partners, venueInfo, relatedCoverage } = view

  return (
    <main className="mx-auto w-full max-w-page header:grid header:grid-cols-article">
      {/* The column divider is the main column's right border: on the rail it would take 1px of the 300px banner. */}
      <div className="flex min-w-0 flex-col pb-16 header:border-r header:border-border header:pb-20">
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
          <Breadcrumb items={view.breadcrumb} />
          {/* From the header breakpoint 12 columns (gap 32): the text in 5 with 24px to spare, the logo box in 7. */}
          <div className="grid gap-6 header:grid-cols-12 header:gap-8">
            <div
              className={cx(
                'flex min-w-0 flex-col justify-between gap-6',
                view.logo ? 'header:col-span-5 header:pr-6' : 'header:col-span-12',
              )}
            >
              <div className="flex max-w-182 flex-col gap-3">
                {view.typeLabel && <p className="text-caption leading-none font-medium text-accent">{view.typeLabel}</p>}
                <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{view.title}</h1>
              </div>
              <div className="pb-2">
                <Meta
                  items={meta}
                  tag={view.status.label}
                  tagLabel={view.status.prefix}
                  className="leading-none"
                />
              </div>
            </div>
            {view.logo && (
              // The design's media box (360 high, 220 on mobile). Event logos are drawn for a dark ground, as the
              // awards edition logos: contained on `foreground`, 24px inside, at most 360 wide as on the awards page.
              // 7 of 12 columns (~550) from the header breakpoint, the column width below it.
              <div className="flex h-55 min-w-0 items-center justify-center overflow-hidden rounded-sm bg-foreground p-6 md:h-90 header:col-span-7">
                <Media image={view.logo} sizes="360px" fit="contain-center" className="size-full max-w-90" />
              </div>
            )}
          </div>
        </header>

        {view.nav.length > 0 && (
          // Sticks under the sticky site header (z-40), above the page content.
          <div className={`sticky top-header z-30 mt-8 bg-white md:mt-10 ${PAD}`}>
            <SectionNav items={view.nav} label={NAV_LABEL} />
          </div>
        )}

        <div>
          {overview && (
            <Section
              id="overview"
              heading={overview.heading}
              // The event format beside the copy from the header breakpoint (7fr | 5fr); without it the copy takes the row.
              className={cx(INSET, 'mt-10 grid gap-10 header:gap-8', overview.format && 'header:grid-cols-overview')}
            >
              {(heading) => (
                <>
                  <div className="flex min-w-0 flex-col gap-6">
                    {heading}
                    {/* 640 wide beside the event format; the full width without it. */}
                    {overview.body && <RichText value={overview.body} className={overview.format ? COPY : TEXT} />}
                  </div>
                  {overview.format && (
                    <div className="flex min-w-0 flex-col gap-4 header:pt-12">
                      <h3 className={SUBHEADING}>{overview.format.label}</h3>
                      <ul className="flex flex-col gap-3">
                        {overview.format.items.map((item, index) => (
                          <li key={index} className="flex items-baseline gap-3 text-base leading-copy text-pretty text-grey">
                            <span aria-hidden="true" className="size-1 shrink-0 -translate-y-0.75 rounded-full bg-focus" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {speakers && (
            <Section id="speakers" heading={speakers.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  <Groups groups={speakers.groups}>
                    {(group, nameAs) => (
                      <ul className={cx(GRID, 'items-start')}>
                        {group.people.map((person) => (
                          <li key={person.key} className="flex min-w-0 flex-col">
                            <SpeakerCard
                              name={person.name}
                              nameAs={nameAs}
                              role={person.jobTitle}
                              organisation={person.company}
                              tag={person.chair ? speakers.chairLabel : null}
                              photo={person.photo}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Groups>
                </>
              )}
            </Section>
          )}

          {whyAttend && (
            <Section id="why-attend" heading={whyAttend.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  {/* From the header breakpoint 12 columns (gap 32): the intro in the left 6, the points in the right
                      6; stacked 24 apart below it. Without an intro the points take the left half. */}
                  <div className="grid items-start gap-6 header:grid-cols-12 header:gap-8">
                    {whyAttend.intro && (
                      <RichText value={whyAttend.intro} className={cx(TEXT, 'min-w-0 header:col-span-6')} />
                    )}
                    {/* Plain points, a rule between them only. */}
                    <ul className="flex min-w-0 flex-col header:col-span-6">
                      {whyAttend.points.map((point, index) => (
                        <li
                          key={index}
                          className={cx(TEXT, 'border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0')}
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </Section>
          )}

          {agenda && (
            <Section id="agenda" heading={agenda.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  {agenda.tracks.length > 0 && (
                    <Groups groups={agenda.tracks.map((track) => ({ ...track, name: track.title }))}>
                      {(track, titleAs) => <AgendaTrack track={track} titleAs={titleAs} />}
                    </Groups>
                  )}
                  {agenda.text && <RichText value={agenda.text} className={COPY} />}
                </>
              )}
            </Section>
          )}

          {partners && (
            <Section id="sponsors-and-partners" heading={partners.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  <Groups groups={partners.groups}>
                    {(group) => (
                      <ul className={GRID}>
                        {group.partners.map((partner) => (
                          <li key={partner.key} className="flex min-w-0 flex-col">
                            <PartnerCard
                              name={partner.name}
                              label={partner.label}
                              logo={partner.logo}
                              description={partner.description}
                              href={partner.href}
                              hoverFrom="header"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Groups>
                </>
              )}
            </Section>
          )}

          {(venueInfo || relatedCoverage) && (
            // Side by side from md (gap 32), stacked 40 apart below it.
            <div
              className={cx(SECTION, 'grid items-start gap-10 md:gap-8', venueInfo && relatedCoverage && 'md:grid-cols-2')}
            >
              {venueInfo && (
                <Section id="venue" heading={venueInfo.heading} className="flex min-w-0 flex-col gap-6">
                  {(heading) => (
                    <>
                      {heading}
                      <DefinitionList items={venueInfo.items} variant="plain" />
                    </>
                  )}
                </Section>
              )}
              {relatedCoverage && (
                <Section id="related-coverage" heading={relatedCoverage.heading} className="flex min-w-0 flex-col gap-6">
                  {(heading) => (
                    <>
                      {heading}
                      <ul className="flex flex-col">
                        {relatedCoverage.links.map((link) => (
                          <li key={link.key} className="flex">
                            <LinkRow href={link.href} label={link.label} chevronAlign="top" />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Section>
              )}
            </div>
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
        {view.relatedEvents.items.length > 0 && (
          <OtherProgrammes
            {...view.relatedEvents}
            spacing="relaxed"
            className="w-full header:sticky header:top-rail header:w-75"
          />
        )}
      </aside>
    </main>
  )
}

/**
 * A section the section navigation links to (`data-section-anchor` lands it below the sticky nav), labelled by its
 * CMS heading (20/24) when it has one. `children` places the heading.
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
      {children(
        heading && (
          <Heading as={heading.as} id={`${id}-heading`} className={HEADING}>
            {heading.text}
          </Heading>
        ),
      )}
    </section>
  )
}

/**
 * Named groups (speaker types, agenda tracks, sponsor tiers): with a name, each group sits under it (h3 16/20.8 500,
 * not in the design, as the awards judging panels), the groups 40 apart, and the items' own headings become h4. The
 * adapter names groups only when there are several; one group renders its content alone.
 */
function Groups<G extends { key: string; name: string | null }>({
  groups,
  children,
}: {
  groups: G[]
  children: (group: G, itemHeading: 'h3' | 'h4') => ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-10">
      {groups.map((group) =>
        group.name ? (
          <div key={group.key} className="flex min-w-0 flex-col gap-4">
            <h3 className={SUBHEADING}>{group.name}</h3>
            {children(group, 'h4')}
          </div>
        ) : (
          <Fragment key={group.key}>{children(group, 'h3')}</Fragment>
        ),
      )}
    </div>
  )
}

function AgendaTrack({ track, titleAs }: { track: EventAgendaTrackView; titleAs: 'h3' | 'h4' }) {
  return (
    <AgendaList
      titleAs={titleAs}
      items={track.items.map((item) => ({
        key: item.key,
        time: item.time,
        type: item.sessionType,
        title: item.title,
        description: item.description && <RichText value={item.description} size="sm" className="text-grey" />,
        people: item.people,
      }))}
    />
  )
}
