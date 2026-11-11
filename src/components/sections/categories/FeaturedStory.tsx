import Link from 'next/link'

import { ArrowLink } from '@/components/ui/ArrowLink'
import { cx } from '@/components/ui/cx'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import type { CategoriesCardView } from '@/lib/categories'
import { formatLongDate } from '@/lib/dates'

// The image's rendered width per layout:
// - from 1200 it spans 7 of 12 columns: at most ~540px, in a 360px-high box narrower than 16:9 that crops the sides,
//   so 360 × 16/9 = 640px;
// - 768–1199: the column minus 2 × 32px padding, 300px high, wider than 16:9;
// - below 768: the column minus 2 × 16px, 220px high and narrower than 16:9: at least 220 × 16/9 ≈ 391px (24.4375rem).
const IMAGE_SIZES = '(min-width: 75rem) 640px, (min-width: 48rem) calc(100vw - 4rem), max(100vw - 2rem, 24.4375rem)'

/**
 * Page 1's first post. From the header breakpoint a 12-column grid: text 5 (meta and headline at the top, summary
 * and the read link at the bottom) beside the image 7, both 360px high. Below it stacked, image first.
 */
export function FeaturedStory({
  story,
  readLabel,
  className,
}: {
  story: CategoriesCardView
  readLabel: string
  className?: string
}) {
  const date = formatLongDate(story.publishedAt)
  const meta = [
    ...(story.category ? [story.category.label] : []),
    ...(date && story.publishedAt ? [<time key="date" dateTime={story.publishedAt}>{date}</time>] : []),
  ]

  return (
    <article
      className={cx(
        'grid grid-cols-1 items-start gap-6 border-t border-border pt-8 md:pt-10 header:min-h-90 header:grid-cols-12 header:gap-8',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col justify-between gap-6 self-stretch header:col-span-5 header:min-h-90 header:pr-6">
        <div className="flex flex-col gap-3">
          {meta.length > 0 && <Meta items={meta} className="leading-none" />}
          <h2 className="text-title-2xl font-medium text-pretty">
            <Link href={story.href} className="transition-colors duration-180 ease-out hover:text-accent">
              {story.title}
            </Link>
          </h2>
        </div>
        <div className="flex flex-col items-start gap-6">
          {story.standfirst && <p className="text-base leading-copy text-pretty text-grey">{story.standfirst}</p>}
          <ArrowLink href={story.href} variant="accent" hover="fade">
            {readLabel}
          </ArrowLink>
        </div>
      </div>
      {/* The headline link already names the story: the image repeats it for the pointer only. */}
      <Link
        href={story.href}
        tabIndex={-1}
        aria-hidden="true"
        className="group order-first block min-w-0 header:order-none header:col-span-7"
      >
        <Media image={story.image} sizes={IMAGE_SIZES} priority zoom="slow" className="h-55 w-full md:h-75 header:h-90" />
      </Link>
    </article>
  )
}
