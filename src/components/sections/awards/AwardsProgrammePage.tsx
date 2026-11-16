import { type ReactNode } from 'react'

import { RichText } from '@/components/sections/article/ArticleBody'
import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { AwardWinnerGalleryCard } from '@/components/ui/AwardWinnerGalleryCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { CategoryTag } from '@/components/ui/CategoryTag'
import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { LinkRow } from '@/components/ui/LinkRow'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { SectionNav } from '@/components/ui/SectionNav.client'
import { SpeakerCard } from '@/components/ui/SpeakerCard'
import type { AwardsProgrammeView, HeadingView, JudgesPanelView, WinnersGroupView } from '@/lib/awards-programme'
import { adPositionLabel } from '@/lib/gam'

import { HighlightVideo } from './HighlightVideo.client'
import { OtherProgrammes } from './OtherProgrammes'
import { WinnersFilter } from './WinnersFilter.client'

// Screen-reader-only texts. Visible copy comes from the CMS.
const NAV_LABEL = 'Programme sections'
const STATUS_PREFIX = 'Status: '
const WINNERS_FILTER_LABEL = 'Filter winners by category'
const VIDEO_TITLE = 'Highlights video'
const CLOSE_VIDEO_LABEL = 'Close video'
const playLabel = (title: string) => `Play video: ${title}`

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// The same inset as a margin, for sections whose top rule spans the content width only.
const INSET = 'mx-gutter header:mx-16'

// A main column section after the overview: 64px below the previous one, a rule, then 40px above its heading. Without an
// overview the first section takes the overview's place: 40px below the nav and no rule.
const SECTION = `${INSET} mt-16 border-t border-border pt-10 first:mt-10 first:border-t-0 first:pt-0`

// The overview and the video intro: stacked 24 apart below the header breakpoint; from it a 12-column grid (gap 32)
// with the text in columns 1–7 and the media in 9–12. Below it the media is at most 360 wide.
const SPLIT = 'grid items-start gap-6 header:grid-cols-12 header:gap-8'
const SPLIT_TEXT = 'flex min-w-0 flex-col header:col-span-7'
const SPLIT_MEDIA = 'w-full max-w-90 header:col-span-4 header:col-start-9 header:max-w-none'

// Grey body copy, 16/22.4.
const COPY = 'text-base leading-copy text-pretty text-grey'

// Section headings 20/24; the overview's is 28/32.
const HEADING = 'text-title-lg font-medium'

// Three cards a row from the header breakpoint, two from md, one below.
const GRID = 'grid md:grid-cols-2 header:grid-cols-3'

/**
 * The awards programme page (one awards edition at /events/{slug}), ClearView only, as Claude Design v1.5. The shell
 * is the award category page's: from the header breakpoint the main column beside a 364px right rail, below it the
 * rail under the column. Main column: Top banner, breadcrumb, title, standfirst, status tag | date | venue | country,
 * Register and previous year links, the sticky section navigation, then Overview, Highlight video, Judging panel,
 * Winners, and Categories beside the Awards marketing kit (side by side from the header breakpoint only). Rail: Side
 * banner, then Other awards programmes, which sticks 32px under the header on desktop. Each part without content is
 * left out, its heading and navigation link included.
 */
export function AwardsProgrammePage({ view }: { view: AwardsProgrammeView }) {
  const meta = [view.date, view.venue, view.country].filter((item): item is string => Boolean(item))
  const { winners, categories, marketingKit } = view

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

        <header className={`flex flex-col gap-6 ${PAD} pt-8 md:pt-10`}>
          <Breadcrumb items={view.breadcrumb} darkLast />
          <div className="flex max-w-182 flex-col gap-3">
            <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{view.title}</h1>
            {view.standfirst && <p className={cx(COPY, 'whitespace-pre-line')}>{view.standfirst}</p>}
          </div>
          {(view.status || meta.length > 0) && (
            <Meta
              items={meta}
              tag={view.status && <span className={view.status.highlight ? 'text-accent' : undefined}>{view.status.label}</span>}
              tagLabel={STATUS_PREFIX}
              className="leading-none"
            />
          )}
          {(view.register || view.previousYear) && (
            // Mobile: stacked, the button full width. From md one row, 32 apart.
            <div className="flex flex-col gap-4 pt-2 md:flex-row md:flex-wrap md:items-center md:gap-x-8">
              {view.register && (
                <Button href={view.register.href} size="compact" motion="out" className="px-5">
                  {view.register.label}
                </Button>
              )}
              {view.previousYear && (
                <ArrowLink href={view.previousYear.href} variant="accent" hover="fade-tall">
                  {view.previousYear.label}
                </ArrowLink>
              )}
            </div>
          )}
        </header>

        {view.nav.length > 0 && (
          // Sticks under the sticky site header (z-40), above the page content.
          <div className={`sticky top-header z-30 mt-8 bg-white md:mt-10 ${PAD}`}>
            <SectionNav items={view.nav} label={NAV_LABEL} />
          </div>
        )}

        <div>
          {view.overview && (
            <section
              id="overview"
              data-section-anchor
              aria-labelledby={view.overview.heading ? 'overview-heading' : undefined}
              className={cx(INSET, 'mt-10', SPLIT)}
            >
              <div className={cx(SPLIT_TEXT, 'gap-6')}>
                {view.overview.heading && (
                  <Heading as={view.overview.heading.as} id="overview-heading" className="text-title-2xl font-medium">
                    {view.overview.heading.text}
                  </Heading>
                )}
                {view.overview.body && <RichText value={view.overview.body} className={COPY} />}
              </div>
              {view.overview.logo && (
                // The design's 3:2 media box. The edition logos are wide wordmarks drawn in white for a dark ground
                // (the design's image is such a logo on dark blue): contained on `foreground`, 24px inside, not cropped.
                // 4 of 12 columns (~295) from the header breakpoint, at most 360 below it.
                <div className={cx(SPLIT_MEDIA, 'aspect-3/2 overflow-hidden rounded-sm bg-foreground p-6')}>
                  <Media image={view.overview.logo} sizes="360px" fit="contain-center" className="size-full" />
                </div>
              )}
            </section>
          )}

          {view.video && (
            <section
              id="highlight-video"
              aria-labelledby={view.video.heading ? 'highlight-video-heading' : undefined}
              className={SECTION}
            >
              <div className={SPLIT}>
                <div className={cx(SPLIT_TEXT, 'gap-3')}>
                  {view.video.heading && (
                    <Heading as={view.video.heading.as} id="highlight-video-heading" className={HEADING}>
                      {view.video.heading.text}
                    </Heading>
                  )}
                  {view.video.description && <p className={cx(COPY, 'whitespace-pre-line')}>{view.video.description}</p>}
                </div>
                <HighlightVideo
                  title={view.video.heading?.text ?? null}
                  name={view.video.heading?.text ?? VIDEO_TITLE}
                  thumbnail={view.video.thumbnail}
                  playerSrc={view.video.playerSrc}
                  consent={view.video.consent}
                  playLabel={playLabel(view.video.heading?.text ?? VIDEO_TITLE)}
                  closeLabel={CLOSE_VIDEO_LABEL}
                  className={SPLIT_MEDIA}
                />
              </div>
            </section>
          )}

          {view.judges && <Judges judges={view.judges} />}

          {winners && (
            <Section id="winners" heading={winners.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
                    {heading}
                    {winners.previousYear && (
                      <ArrowLink href={winners.previousYear.href} variant="accent" hover="fade" align="center">
                        {winners.previousYear.label}
                      </ArrowLink>
                    )}
                  </div>
                  <WinnersFilter
                    label={WINNERS_FILTER_LABEL}
                    allLabel={winners.allLabel}
                    total={winners.total}
                    groups={winners.groups.map((group) => ({
                      key: group.key,
                      label: group.label,
                      count: group.winners.length,
                      content: <WinnersGroup group={group} />,
                    }))}
                  />
                </>
              )}
            </Section>
          )}

          {(categories || marketingKit) && (
            <div
              className={cx(SECTION, 'grid items-start gap-x-8 gap-y-16', categories && marketingKit && 'header:grid-cols-2')}
            >
              {categories && (
                <Section id="categories" heading={categories.heading} className="flex min-w-0 flex-col gap-4">
                  {(heading) => (
                    <>
                      {heading}
                      <ul className="flex flex-wrap gap-3">
                        {categories.items.map((item, index) => (
                          <li key={index} className="flex max-w-full">
                            <CategoryTag label={item} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Section>
              )}
              {marketingKit && (
                <Section id="marketing-kit" heading={marketingKit.heading} className="flex min-w-0 flex-col gap-4">
                  {(heading) => (
                    <>
                      {heading}
                      <p className={cx(COPY, 'whitespace-pre-line')}>{marketingKit.text}</p>
                      <ul className="flex flex-col pt-2">
                        <li className="flex">
                          <LinkRow href={marketingKit.link.href} label={marketingKit.link.label} />
                        </li>
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
        {view.otherProgrammes.items.length > 0 && (
          <OtherProgrammes
            {...view.otherProgrammes}
            spacing="default"
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

type JudgesData = NonNullable<AwardsProgrammeView['judges']>

/**
 * The judging panel: heading and intro (at most 728 wide, 12 apart), then the judges 3 / 2 / 1 a row (gap 40 / 32).
 * With more than one panel each panel's people sit under its name (h3 16/20.8 500, as the winners' group titles; not
 * in the design), the panels 40 apart, and the judges' names become h4.
 */
function Judges({ judges }: { judges: JudgesData }) {
  const named = judges.panels.some((panel) => panel.name)

  return (
    <Section id="judging-panel" heading={judges.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
      {(heading) => (
        <>
          {(heading || judges.intro) && (
            <div className="flex max-w-182 flex-col gap-3">
              {heading}
              {judges.intro && <RichText value={judges.intro} className={COPY} />}
            </div>
          )}
          {named ? (
            <div className="flex flex-col gap-10">
              {judges.panels.map((panel) => (
                <div key={panel.key} className="flex flex-col gap-4">
                  {panel.name && <h3 className="text-base leading-title font-medium">{panel.name}</h3>}
                  <JudgesGrid panel={panel} judges={judges} nameAs={panel.name ? 'h4' : 'h3'} />
                </div>
              ))}
            </div>
          ) : (
            judges.panels.map((panel) => <JudgesGrid key={panel.key} panel={panel} judges={judges} nameAs="h3" />)
          )}
        </>
      )}
    </Section>
  )
}

function JudgesGrid({ panel, judges, nameAs }: { panel: JudgesPanelView; judges: JudgesData; nameAs: 'h3' | 'h4' }) {
  return (
    <ul className={cx(GRID, 'items-start gap-x-8 gap-y-10')}>
      {panel.people.map((person) => (
        <li key={person.key} className="flex min-w-0 flex-col">
          <SpeakerCard
            name={person.name}
            nameAs={nameAs}
            role={person.jobTitle}
            organisation={person.company}
            photo={person.photo}
            bio={person.bio && <RichText value={person.bio} size="sm" className="text-grey" />}
            showBioLabel={judges.viewBiographyLabel}
            hideBioLabel={judges.hideBiographyLabel}
          />
        </li>
      ))}
    </ul>
  )
}

/** One category group: its name (16/20.8 500), then a gallery card per winner, 3 / 2 / 1 a row (gap 32 / 24 / 16). */
function WinnersGroup({ group }: { group: WinnersGroupView }) {
  const headingId = `${group.id}-heading`

  return (
    <section id={group.id} aria-labelledby={group.label ? headingId : undefined} className="flex min-w-0 flex-col gap-4">
      {group.label && (
        <h3 id={headingId} className="text-base leading-title font-medium">
          {group.label}
        </h3>
      )}
      <ul className={cx(GRID, 'gap-4 md:gap-6 header:gap-8')}>
        {group.winners.map((winner) => (
          <li key={winner.key} className="flex min-w-0">
            <AwardWinnerGalleryCard
              category={winner.category}
              categoryHref={winner.categoryHref}
              name={winner.company}
              logo={winner.logo}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
