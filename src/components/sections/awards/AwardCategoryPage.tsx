import Link from 'next/link'

import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { AwardWinnerCard } from '@/components/ui/AwardWinnerCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { cx } from '@/components/ui/cx'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { Heading } from '@/components/ui/Heading'
import { ListLink } from '@/components/ui/ListLink'
import { Meta } from '@/components/ui/Meta'
import type { AwardCategoryView, AwardYearView } from '@/lib/award-category'
import { adPositionLabel } from '@/lib/gam'

import { WinnersByYear } from './WinnersByYear.client'

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// A main column section after the header: a rule, then 40px above its heading.
const SECTION = 'border-t border-border pt-10'

// Screen-reader-only name of the year selector (the design's select-label). Visible copy comes from the CMS.
const YEAR_SELECT_LABEL = 'Select award year'

/**
 * The award category page (one category as awarded by one programme), ClearView only. As the article and Categories
 * templates: from the header breakpoint the main column beside a 364px right rail, below it the rail under the column.
 * Main column: Top banner, breadcrumb, title, edition and group line, description, Category details, Winners by year.
 * Rail: Side banner, then Other awards programmes, which sticks 32px under the header on desktop.
 * Each part without content is left out, its heading included.
 */
export function AwardCategoryPage({ view }: { view: AwardCategoryView }) {
  const { copy } = view
  const meta = [
    ...(view.edition
      ? [
          view.edition.href ? (
            <Link
              key="edition"
              href={view.edition.href}
              prefetch={false}
              className="transition-colors duration-180 ease-out hover:text-accent"
            >
              {view.edition.title}
            </Link>
          ) : (
            view.edition.title
          ),
        ]
      : []),
    ...view.groups,
  ]

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
          <Breadcrumb items={view.breadcrumb} />
          <div className="flex max-w-182 flex-col gap-3">
            <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{view.title}</h1>
            {meta.length > 0 && <Meta items={meta} wrapItems />}
            {view.description && (
              <p className="text-base leading-copy whitespace-pre-line text-pretty text-grey">{view.description}</p>
            )}
          </div>
        </header>

        {view.details.length > 0 && (
          <div className={PAD}>
            <section aria-labelledby="category-details-heading" className={`mt-10 flex flex-col gap-10 ${SECTION}`}>
              <h2 id="category-details-heading" className="text-title-lg font-medium">
                {copy.detailsHeading}
              </h2>
              <DefinitionList variant="detail" items={view.details} />
            </section>
          </div>
        )}

        {view.years.length > 0 && (
          <div className={cx(PAD, view.details.length > 0 ? 'mt-16' : 'mt-10')}>
            <div className={SECTION}>
              <WinnersByYear
                heading={copy.winnersHeading}
                selectLabel={YEAR_SELECT_LABEL}
                years={view.years.map((year) => ({ year: year.year, content: <YearWinners year={year} /> }))}
              />
            </div>
          </div>
        )}
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
            className="w-full header:sticky header:top-rail header:w-75"
          />
        )}
      </aside>
    </main>
  )
}

/** One year's winners: usually one card, a list when the category had several winners that year. */
function YearWinners({ year }: { year: AwardYearView }) {
  return (
    <ul className="flex flex-col gap-3">
      {year.winners.map((winner) => (
        <li key={winner.key}>
          <AwardWinnerCard href={winner.href} label={year.label} name={winner.name} note={winner.note} logo={winner.logo} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Other awards programmes (shared-shell other-awards-programme-card, `relaxed`): title, then status | place | date.
 * A picked past edition has no status. The heading's tag comes from the CMS; the list shows without it when it is empty.
 */
function OtherProgrammes({
  heading,
  items,
  className,
}: AwardCategoryView['otherProgrammes'] & { className?: string }) {
  return (
    <section
      aria-labelledby={heading ? 'other-programmes-heading' : undefined}
      className={cx('flex flex-col gap-6', className)}
    >
      {heading && (
        <Heading as={heading.as} id="other-programmes-heading" className="text-title-lg leading-tight font-medium">
          {heading.text}
        </Heading>
      )}
      <ul className="flex flex-col border-t border-border">
        {items.map((item) => (
          <li key={item.key} className="border-b border-border last:border-b-0">
            <ListLink
              variant="accent"
              relaxed
              href={item.href}
              title={item.title}
              meta={[
                ...(item.status
                  ? [
                      <span key="status" className={item.highlight ? 'text-accent' : undefined}>
                        {item.status}
                      </span>,
                    ]
                  : []),
                ...item.meta,
              ]}
              className="pt-4 pb-6"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
