import { stegaClean } from 'next-sanity'
import { type ReactNode } from 'react'

import { RichText } from '@/components/sections/article/ArticleBody'
import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { AwardWinnerGalleryCard } from '@/components/ui/AwardWinnerGalleryCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'
import { FaqAccordionItem } from '@/components/ui/FaqAccordionItem.client'
import { Heading } from '@/components/ui/Heading'
import { LinkRow } from '@/components/ui/LinkRow'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { SectionNav } from '@/components/ui/SectionNav.client'
import { SpeakerCard } from '@/components/ui/SpeakerCard'
import { trackAttributes } from '@/lib/analytics'
import type {
  AwardsProgrammeView,
  HeadingView,
  JudgesPanelView,
  SponsorTierView,
  WinnersGroupView,
} from '@/lib/awards-programme'
import { adPositionLabel } from '@/lib/gam'

import { HighlightVideo } from './HighlightVideo.client'
import { OtherProgrammes } from './OtherProgrammes'

// Screen-reader-only texts. Visible copy comes from the CMS.
const NAV_LABEL = 'Programme sections'
const STATUS_PREFIX = 'Status: '
const CLOSE_VIDEO_LABEL = 'Close video'
const CLOSE_BIO_LABEL = 'Close biography'
const playLabel = (title: string) => `Play video: ${title}`
const openBioLabel = (name: string) => `Open biography: ${name}`

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
// The header and the sections are size containers: the design switches its splits on the column's width, not the
// viewport's (`@split` 872: masthead, video, registration and Acclaim side by side; `@cards-*`: card columns).
const PAD = 'px-gutter header:px-16'

// A section after the first: 64px below the previous one, a rule, then 40px above its heading. The first one sits
// 40px below the nav with no rule. `PLAIN`: the same spacing without the rule (the registration card, and the
// sponsors directly after it, as the design).
const SECTION = 'mt-16 border-t border-border pt-10 first:mt-10 first:border-t-0 first:pt-0'
const PLAIN = 'mt-16 first:mt-10'

// Grey body copy, 16/22.4.
const COPY = 'text-base leading-copy text-pretty text-grey'

// Section headings 20/24; the overview's is 28/32.
const HEADING = 'text-title-lg font-medium'

// Judges and winners: one card a row, two once the column is 504 wide, three from 844.
const CARDS = 'grid @cards-2:grid-cols-2 @cards-3:grid-cols-3'

// Card gaps per breakpoint: 16 / 24 / 32 (winners, sponsors).
const CARD_GAP = 'gap-4 md:gap-6 header:gap-8'

// Winner category groups and sponsor tiers: 16/20.8 500.
const GROUP_HEADING = 'text-base leading-title font-medium'

/**
 * The awards programme page (one awards edition at /events/{slug}), ClearView only, as Claude Design v1.11. From the
 * header breakpoint the main column beside a 364px right rail, below it the rail under the column. Main column: Top banner, breadcrumb, the dark masthead (edition logo, title, standfirst, status | date |
 * venue | country, Register interest, Become a Sponsoring Partner, View previous year), the sticky wrapping section
 * navigation, then Overview, Highlight video, Categories and Registration, Sponsors, Judging panel, Winners, Acclaim,
 * FAQ. A section without content is left out with its navigation link. Rail (v1.11): Side banner, "View all awards",
 * then Other awards programmes (every open edition, pins first), with its empty text when nothing is open.
 */
export function AwardsProgrammePage({ view }: { view: AwardsProgrammeView }) {
  const { overview, video, registration, sponsors, judges, winners, acclaim, faq, openProgrammes } = view

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

        <header className={`@container flex flex-col gap-6 ${PAD} pt-8 md:pt-10`}>
          <Breadcrumb items={view.breadcrumb} darkLast />
          <Masthead view={view} />
        </header>

        {view.nav.length > 0 && (
          // Sticks under the sticky site header (z-40), above the page content. The items wrap onto more rows.
          <div className={`sticky top-header z-30 mt-8 bg-white md:mt-10 ${PAD}`}>
            <SectionNav items={view.nav} label={NAV_LABEL} wrap />
          </div>
        )}

        <div className={`@container ${PAD}`}>
          {overview && (
            <Section id="overview" heading={overview.heading} className={cx(SECTION, 'flex max-w-182 flex-col gap-6')}>
              {() => (
                <>
                  {overview.heading && (
                    <Heading as={overview.heading.as} id="overview-heading" className="text-title-2xl font-medium">
                      {overview.heading.text}
                    </Heading>
                  )}
                  <RichText value={overview.body} spacing="tight" className={cx(COPY, 'wrap-break-word')} />
                </>
              )}
            </Section>
          )}

          {video && (
            <Section
              id="highlight-video"
              heading={video.heading}
              className={cx(SECTION, 'grid items-start gap-6 @split:grid-cols-12 @split:gap-8')}
            >
              {(heading) => (
                <>
                  <div className="flex min-w-0 flex-col gap-6 @split:col-span-5">
                    {heading}
                    {video.description && <p className={cx(COPY, 'whitespace-pre-line')}>{video.description}</p>}
                  </div>
                  <HighlightVideo
                    title={video.dialogTitle || null}
                    name={video.dialogTitle || video.heading?.text || ''}
                    thumbnail={video.thumbnail}
                    playerSrc={video.playerSrc}
                    consent={video.consent}
                    playLabel={playLabel(video.dialogTitle || video.heading?.text || '')}
                    closeLabel={CLOSE_VIDEO_LABEL}
                    className="@split:col-span-6 @split:col-start-7"
                  />
                </>
              )}
            </Section>
          )}

          {registration && (
            <Section id="categories-and-registration" heading={registration.heading} className={PLAIN}>
              {(heading) => (
                // A grey card: from 872 a 12-column grid, the intro in 1–6 and the steps in 7–12; stacked below.
                <div className="grid items-start gap-6 rounded-sm border border-border bg-surface-subtle p-6 md:p-8 @split:grid-cols-12 @split:gap-8">
                  <div className="flex min-w-0 flex-col gap-6 @split:col-span-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        {heading}
                        {registration.badge && (
                          <span className="inline-flex h-6 items-center rounded-sm bg-white px-2 text-caption leading-none whitespace-nowrap text-foreground inset-ring inset-ring-border">
                            {registration.badge}
                          </span>
                        )}
                      </div>
                      {registration.intro && <p className={COPY}>{registration.intro}</p>}
                    </div>
                    {registration.faqLink && (
                      // The 44px target overhangs the row by 10px above and below, as the design.
                      <div className="-my-2.5 flex">
                        <ArrowLink href="#faq" variant="accent" hover="fade-tall">
                          {registration.faqLink}
                        </ArrowLink>
                      </div>
                    )}
                  </div>
                  <ol className="flex max-w-182 min-w-0 flex-col gap-4 @split:col-span-6 @split:col-start-7">
                    {registration.steps.map((step, index) => (
                      <li key={step.key} className="grid grid-cols-numbered items-start gap-x-2">
                        <span aria-hidden="true" className="text-base leading-copy font-medium text-foreground tabular-nums">
                          {index + 1}.
                        </span>
                        <RichText value={step.text} spacing="tight" className={cx(COPY, 'strong-lead wrap-break-word')} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Section>
          )}

          {sponsors && (
            <Section
              id="sponsors"
              heading={sponsors.heading}
              className={cx(registration ? PLAIN : SECTION, 'flex flex-col gap-6')}
            >
              {(heading) => (
                <>
                  {heading}
                  <div className="flex flex-col gap-10">
                    {sponsors.tiers.map((tier) => (
                      <SponsorTier key={tier.key} tier={tier} />
                    ))}
                  </div>
                </>
              )}
            </Section>
          )}

          {judges && <Judges judges={judges} />}

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
                  <div className="flex flex-col gap-10">
                    {winners.groups.map((group) => (
                      <WinnersGroup key={group.key} group={group} />
                    ))}
                  </div>
                </>
              )}
            </Section>
          )}

          {acclaim && (
            <Section
              id="acclaim"
              heading={acclaim.heading}
              className={cx(SECTION, 'grid items-start gap-x-8 gap-y-4 @split:grid-cols-12 @split:gap-y-6')}
            >
              {(heading) => (
                <>
                  {heading && <div className="min-w-0 @split:col-span-5 @split:row-start-1">{heading}</div>}
                  <p className={cx(COPY, 'min-w-0 whitespace-pre-line @split:col-span-5 @split:row-start-2')}>
                    {acclaim.text}
                  </p>
                  <ul className="flex min-w-0 flex-col @split:col-span-6 @split:col-start-7 @split:row-start-2">
                    <li className="flex">
                      <LinkRow href={acclaim.link.href} label={acclaim.link.label} />
                    </li>
                  </ul>
                </>
              )}
            </Section>
          )}

          {faq && (
            <Section id="faq" heading={faq.heading} className={cx(SECTION, 'flex flex-col gap-6')}>
              {(heading) => (
                <>
                  {heading}
                  <div className="flex min-w-0 flex-col">
                    {faq.items.map((item, index) => (
                      <FaqAccordionItem
                        key={item.key}
                        question={item.question}
                        answer={<RichText value={item.answer} spacing="tight" className="wrap-break-word" />}
                        last={index === faq.items.length - 1}
                      />
                    ))}
                  </div>
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
          {/* Left-aligned below the header breakpoint, as the design. */}
          <AdSlot size="mpu" align="start" unit={view.ads.side} label={adPositionLabel('side')} />
        </div>
        {openProgrammes.allAwards && (
          <ArrowLink href={openProgrammes.allAwards.href} variant="accent" hover="fade">
            {openProgrammes.allAwards.label}
          </ArrowLink>
        )}
        {/* Every open programme, so the list is long: it scrolls with the page instead of sticking. */}
        <OtherProgrammes
          heading={openProgrammes.heading}
          items={openProgrammes.items}
          emptyText={openProgrammes.emptyText}
          spacing="default"
          className="w-full header:w-75"
        />
      </aside>
    </main>
  )
}

/**
 * The dark masthead (`masthead` navy, 4px corners). Once the column is 872 wide (`@split`): at least 360 high, padded
 * 32 / 40 from the header breakpoint, the text centred in the left half and the edition logo filling the right half
 * behind a white/20 divider. Below that: the logo on top across the full width (3:1 from a 600 column, else 3:2),
 * then a white/20 rule and the text padded 24 / 32 / 40.
 *
 * Deviation from the design, whose image is a photo cropped to fill: edition logos are wordmarks drawn in white and red
 * for a dark ground, so the logo is contained (24 / 32 inside its box), never cropped.
 */
function Masthead({ view }: { view: AwardsProgrammeView }) {
  const meta = [view.date, view.venue, view.country].filter((item): item is string => Boolean(item))
  const { logo } = view

  return (
    <div
      className={cx(
        'relative flex min-w-0 flex-col overflow-hidden rounded-sm bg-masthead',
        '@split:justify-center @split:p-8 header:@split:p-10',
        logo && '@split:min-h-90',
      )}
    >
      {logo && (
        <div
          className={cx(
            'relative w-full p-6 md:p-8 @max-split-sm:aspect-3/2 @split-sm:@max-split:aspect-3/1',
            '@split:absolute @split:inset-y-0 @split:right-0 @split:w-masthead-half @split:border-l @split:border-white/20',
          )}
        >
          <Media image={logo} sizes="(min-width: 75rem) 480px, 100vw" fit="contain-center" priority className="size-full" />
        </div>
      )}
      <div
        className={cx(
          'relative flex min-w-0 flex-col gap-6',
          '@max-split:p-6 md:@max-split:p-8 header:@max-split:p-10',
          logo ? '@max-split:border-t @max-split:border-white/20 @split:max-w-masthead-half' : 'max-w-182',
        )}
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-heading-section font-medium text-balance wrap-anywhere text-white">{view.title}</h1>
          {view.standfirst && (
            <p className="text-base leading-copy text-pretty whitespace-pre-line text-masthead-muted">{view.standfirst}</p>
          )}
        </div>
        {(view.status || meta.length > 0) && (
          <Meta items={meta} variant="masthead" tag={view.status} tagLabel={STATUS_PREFIX} className="leading-none" />
        )}
        {(view.register || view.sponsor || view.previousYear) && (
          // Mobile: stacked, the buttons full width. From md one row, 16 apart, the link 8 further on.
          <div className="flex flex-col gap-4 pt-2 md:flex-row md:flex-wrap md:items-center">
            {view.register && (
              <Button
                href={view.register.href}
                track={trackAttributes('award_entry_click', { programme: stegaClean(view.title) })}
                variant="filled-light"
                size="compact"
                padding="wide"
                motion="out"
                className="w-full md:w-auto"
              >
                {view.register.label}
              </Button>
            )}
            {view.sponsor && (
              <Button
                href={view.sponsor.href}
                variant="outline-on-dark"
                size="compact"
                padding="wide"
                motion="out"
                className="w-full md:w-auto"
              >
                {view.sponsor.label}
              </Button>
            )}
            {view.previousYear && (
              <ArrowLink href={view.previousYear.href} variant="inverse" hover="dim-tall" className="md:ml-2">
                {view.previousYear.label}
              </ArrowLink>
            )}
          </div>
        )}
      </div>
    </div>
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
 * One sponsor tier: its name (16/20.8 500, not in the design, which shows one grid), then the logos 2 / 3 / 4 a row
 * (gap 16 / 24 / 32) on white 3:2 tiles with a `border` rule, padded 16 / 24, each logo 60% of the tile wide (as the
 * design), contained so a tall logo stays inside the tile. A company without a logo shows its name.
 */
function SponsorTier({ tier }: { tier: SponsorTierView }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {tier.name && <h3 className={GROUP_HEADING}>{tier.name}</h3>}
      <ul className={cx('grid grid-cols-2 md:grid-cols-3 header:grid-cols-4', CARD_GAP)}>
        {tier.sponsors.map((sponsor) => (
          <li
            key={sponsor.key}
            className="flex aspect-3/2 min-w-0 items-center justify-center rounded-sm border border-border bg-white p-4 md:p-6"
          >
            {sponsor.logo ? (
              <Media
                image={{ ...sponsor.logo, alt: stegaClean(sponsor.name) }}
                sizes="240px"
                fit="contain-center"
                className="h-full w-3/5"
              />
            ) : (
              <span className="text-center text-base leading-title font-medium text-balance wrap-anywhere text-foreground">
                {sponsor.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

type JudgesData = NonNullable<AwardsProgrammeView['judges']>

/**
 * The judging panel: heading and intro (at most 728 wide, 12 apart), then each panel 48 apart: its name (h3 18/23.4
 * 500) and its judges 1 / 2 / 3 a row by the column's width (gap 40 / 32), 24 below it. A judge's name opens the
 * biography in a dialog. Under a panel name the judges' names are h4.
 */
function Judges({ judges }: { judges: JudgesData }) {
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
          <div className="flex flex-col gap-12">
            {judges.panels.map((panel) => (
              <JudgesPanel key={panel.key} panel={panel} />
            ))}
          </div>
        </>
      )}
    </Section>
  )
}

function JudgesPanel({ panel }: { panel: JudgesPanelView }) {
  const headingId = `judges-panel-${panel.key}`

  return (
    <div role="group" aria-labelledby={panel.name ? headingId : undefined} className="flex min-w-0 flex-col gap-6">
      {panel.name && (
        <h3 id={headingId} className="text-title-sub font-medium">
          {panel.name}
        </h3>
      )}
      <ul className={cx(CARDS, 'items-start gap-x-8 gap-y-10')}>
        {panel.people.map((person) => (
          <li key={person.key} className="flex min-w-0 flex-col">
            {person.bio ? (
              <SpeakerCard
                name={person.name}
                nameAs={panel.name ? 'h4' : 'h3'}
                role={person.jobTitle}
                organisation={person.company}
                photo={person.photo}
                bio={<RichText value={person.bio} size="loose" spacing="tight" />}
                bioDisplay="modal"
                openBioLabel={openBioLabel(person.name)}
                closeBioLabel={CLOSE_BIO_LABEL}
              />
            ) : (
              <SpeakerCard
                name={person.name}
                nameAs={panel.name ? 'h4' : 'h3'}
                role={person.jobTitle}
                organisation={person.company}
                photo={person.photo}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One category group: its name (16/20.8 500), then a gallery card per winner, 1 / 2 / 3 a row by the column's width. */
function WinnersGroup({ group }: { group: WinnersGroupView }) {
  const headingId = `${group.id}-heading`

  return (
    <section id={group.id} aria-labelledby={group.label ? headingId : undefined} className="flex min-w-0 flex-col gap-4">
      {group.label && (
        <h3 id={headingId} className={cx(GROUP_HEADING, 'wrap-anywhere')}>
          {group.label}
        </h3>
      )}
      <ul className={cx(CARDS, CARD_GAP)}>
        {group.winners.map((winner) => (
          <li key={winner.key} className="flex min-w-0">
            <AwardWinnerGalleryCard
              category={winner.category}
              categoryHref={winner.categoryHref}
              name={winner.name}
              wordmark={winner.organisation}
              logo={winner.logo}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
