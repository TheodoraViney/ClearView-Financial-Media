import { cx } from './cx'
import { ResearchChartGauges, type ResearchGauge } from './ResearchChartGauges.client'

export type { ResearchGauge }

export type ResearchChart = { key: string; title: string; note: string | null; gauges: ResearchGauge[] }

/**
 * Claude Design research-chart-card (half-donut): a figure with a 1px `border` ring, radius 4, padding 24 and gap 24;
 * the title as its figcaption (16/20.8 500), the gauges (ResearchChartGauges) and an optional note (13/18.2 grey).
 * The variant follows the gauge count:
 * - two gauges, `split`: from md title over note on the left (the note at the foot), the gauges stacked on the right;
 *   one column (title, gauges, note) on mobile.
 * - one gauge, `stacked`: title, gauge with a rule under it, then the note on two of three columns.
 * It fills its grid cell's height, so cards in a row match.
 */
export function ResearchChartCard({ chart, className }: { chart: ResearchChart; className?: string }) {
  const split = chart.gauges.length > 1

  return (
    <figure
      className={cx(
        'm-0 grid h-full min-w-0 content-start gap-6 rounded-sm bg-white p-6 inset-ring inset-ring-border',
        split && 'md:grid-cols-2 md:content-stretch',
        className,
      )}
    >
      <figcaption
        className={cx(
          'min-w-0 text-base leading-title font-medium text-pretty text-foreground',
          split && 'md:col-start-1 md:row-start-1 md:self-start',
        )}
      >
        {chart.title}
      </figcaption>
      <ResearchChartGauges
        gauges={chart.gauges}
        variant={split ? 'split' : 'stacked'}
        className={split ? 'md:col-start-2 md:row-span-2 md:row-start-1' : undefined}
      />
      {chart.note && (
        <div
          className={cx(
            'grid min-w-0',
            split ? 'md:col-start-1 md:row-start-2 md:self-end' : 'grid-cols-3 gap-x-4 md:gap-x-6',
          )}
        >
          <p className={cx('min-w-0 text-caption text-pretty text-grey', !split && 'col-span-2')}>{chart.note}</p>
        </div>
      )}
    </figure>
  )
}
