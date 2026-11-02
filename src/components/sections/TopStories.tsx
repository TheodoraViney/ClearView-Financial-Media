import Link from 'next/link'

import { ArrowLink } from '@/components/ui/ArrowLink'
import { ArticleRow } from '@/components/ui/ArticleRow'
import { Media, type MediaImage } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import type { ShellVariant } from '@/components/ui/motion'

import { TopStoriesHero } from './TopStories.client'

export type TopStory = {
  id: string
  title: string
  href: string | null
  publication: string | null
  date: string | null
  shortDate: string | null
  /** Publication homes: the post's category and its "28 Sep 2026" date, the card label "category | date". */
  category?: string | null
  mediumDate?: string | null
  excerpt: string | null
  image: MediaImage | null
}

export type TopStoriesProps = {
  /** The link text on each slide, from the CMS. */
  linkLabel: string
  slides: TopStory[]
  articles: TopStory[]
  /** `group` (ClearView, the default): the slider. `publication`: one lead story and the labelled article cards. */
  look?: ShellVariant
  /** Publication homes: the label above the articles ("Top Stories"). */
  label?: string | null
}

/**
 * Home "Top stories": the hero slider and up to three mini articles under it.
 * The slider is a client island that server-renders slide 1; the mini articles are server-only.
 * Publication homes render the lead story server-only (one story, no slider), see PublicationTopStories.
 */
export function TopStories({ linkLabel, slides, articles, look = 'group', label }: TopStoriesProps) {
  if (slides.length === 0) {
    return null
  }

  if (look === 'publication') {
    return <PublicationTopStories linkLabel={linkLabel} story={slides[0]} articles={articles} label={label} />
  }

  // A Sponsored content block right after continues this section: see the before-sponsored variant in globals.css.
  return (
    <section
      aria-label="Top stories"
      data-block="top-stories"
      className="flex flex-col gap-7 px-gutter pb-section before-sponsored:pb-0 md:gap-10"
    >
      <TopStoriesHero slides={slides} linkLabel={linkLabel} />

      {articles.length > 0 && (
        <ul className="flex flex-col border-t border-border lg:grid lg:grid-cols-cards lg:gap-8 lg:border-t-0">
          {articles.map((story) => (
            <li key={story.id} className="flex flex-col">
              <ArticleRow
                href={story.href}
                title={story.title}
                meta={[story.publication, story.shortDate].filter((item): item is string => Boolean(item))}
                image={story.image}
                className="flex-1"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const metaOf = (story: TopStory) =>
  [story.category, story.mediumDate].filter((item): item is string => Boolean(item))

// Lead image. Mobile: full width × 220 high, cropped at the sides → 220 × 16/9 ≈ 391 → 400px. Tablet: full width × 360,
// wider than 16:9 → 100vw. From 1200: 7 of 12 columns (≈ 540 wide at 1440) × 360, cropped at the sides → 360 × 16/9 = 640px.
const LEAD_SIZES = '(min-width: 75rem) 640px, (min-width: 48rem) 100vw, 400px'

/**
 * Publication home lead stories (WB v2.0 `lead-stories`): one lead story with the category | date line, an h1 title
 * and image that both link to the post, the standfirst and "Read article"; then the label ("Top Stories") and three
 * bordered article cards. From 1200 the text takes 5 of 12 columns (at least 360 high, the link at the bottom) and the
 * image 7 (360 high); below 1200 text, then image (360 tablet, 220 mobile). The cards run 3 across from 1200, one column below.
 * The spacing inside is 40 on every breakpoint; a Sponsored content block right after continues the section.
 */
function PublicationTopStories({
  linkLabel,
  story,
  articles,
  label,
}: {
  linkLabel: string
  story: TopStory
  articles: TopStory[]
  label?: string | null
}) {
  const meta = metaOf(story)

  return (
    <section
      aria-label="Lead stories"
      data-block="top-stories"
      className="flex flex-col gap-10 px-side pt-8 pb-12 before-sponsored:pb-0 md:pt-10 md:pb-16 header:pb-20"
    >
      <article className="grid gap-8 header:min-h-90 header:grid-cols-12 header:items-start">
        <div className="flex min-w-0 flex-col justify-between gap-6 header:col-span-5 header:min-h-90 header:self-stretch header:pr-6">
          <div className="flex flex-col gap-3">
            {meta.length > 0 && <Meta items={meta} className="leading-none" />}
            <h1 className="text-heading-section font-medium text-pretty text-foreground">
              {story.href ? (
                <Link href={story.href} className="transition-colors duration-180 ease-out hover:text-accent">
                  {story.title}
                </Link>
              ) : (
                story.title
              )}
            </h1>
          </div>
          {(story.excerpt || (story.href && linkLabel)) && (
            <div className="flex flex-col items-start gap-6">
              {story.excerpt && <p className="text-base leading-copy text-pretty text-grey">{story.excerpt}</p>}
              {story.href && linkLabel && (
                <ArrowLink href={story.href} variant="accent" hover="fade">
                  {linkLabel}
                </ArrowLink>
              )}
            </div>
          )}
        </div>

        {story.href ? (
          // Duplicates the title link, so it is out of the tab order and hidden from assistive tech; the title link names the story.
          <Link href={story.href} tabIndex={-1} aria-hidden="true" className="group block min-w-0 rounded-sm header:col-span-7">
            <Media image={story.image} sizes={LEAD_SIZES} priority zoom="slow" className="h-55 md:h-90" />
          </Link>
        ) : (
          <Media image={story.image} sizes={LEAD_SIZES} priority className="h-55 min-w-0 md:h-90 header:col-span-7" />
        )}
      </article>

      {articles.length > 0 && (
        <div className="flex flex-col gap-4">
          {label && <span className="text-caption leading-none font-medium text-grey">{label}</span>}
          <ul className="grid gap-8 header:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id} className="flex min-w-0 flex-col">
                <ArticleRow
                  href={article.href}
                  title={article.title}
                  meta={metaOf(article)}
                  image={article.image}
                  variant="card"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
