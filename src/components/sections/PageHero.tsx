import { RichText } from '@/components/sections/article/ArticleBody'
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { cx } from '@/components/ui/cx'
import type { HeroIntro } from '@/sanity/page-hero'

/**
 * The head of a page's main column (design wb-g-shared-listings v1.0): breadcrumb, then 24 below it the H1 and the
 * intro (rich text), 16 apart, in the first 7 of 12 columns (gap 32) from the header breakpoint. Side padding 16 / 32 /
 * 64, as the main column's other blocks.
 *
 * No space of its own above: it sits under the page's Top banner position, which leaves 24 / 32 / 40 below it even when
 * hidden. `pt-2 lg:pt-0` tops that up to the design's 32 / 40 / 40 above the breadcrumb.
 *
 * Without `breadcrumb` (Company Engagement) the H1 takes its place, with no space of its own above either.
 */
export function PageHero({
  breadcrumb,
  title,
  intro,
}: {
  breadcrumb?: BreadcrumbItem[]
  title: string
  intro: HeroIntro | null
}) {
  return (
    <div className="px-gutter pt-2 lg:pt-0 header:px-16">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}

      <header className={cx(breadcrumb && 'mt-6', 'header:grid header:grid-cols-12 header:gap-x-8')}>
        <div className="flex min-w-0 flex-col gap-4 header:col-span-7">
          <h1 className="text-heading-section font-medium text-balance wrap-anywhere">{title}</h1>
          {intro && <RichText value={intro} spacing="tight" className="text-grey" />}
        </div>
      </header>
    </div>
  )
}
