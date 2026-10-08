import { ArticleRow } from '@/components/ui/ArticleRow'
import { cx } from '@/components/ui/cx'
import { type MediaImage } from '@/components/ui/Media'

import { TopStoriesHero } from './TopStories.client'

export type TopStory = {
  id: string
  title: string
  href: string | null
  publication: string | null
  date: string | null
  shortDate: string | null
  excerpt: string | null
  image: MediaImage | null
}

export type TopStoriesProps = {
  /** The link text on each slide, from the CMS. */
  linkLabel: string
  slides: TopStory[]
  articles: TopStory[]
}

// Scroll reveal index of each mini article, the same on every breakpoint (the hero does not reveal).
const ARTICLE_REVEAL = ['scroll-reveal-1', 'scroll-reveal-2', 'scroll-reveal-3']

/**
 * Home "Top stories": the hero slider and up to three mini articles under it.
 * The slider is a client island that server-renders slide 1; the mini articles are server-only.
 */
export function TopStories({ linkLabel, slides, articles }: TopStoriesProps) {
  if (slides.length === 0) {
    return null
  }

  return (
    <section aria-label="Top stories" className="flex flex-col gap-7 px-gutter pb-section md:gap-10">
      <TopStoriesHero slides={slides} linkLabel={linkLabel} />

      {articles.length > 0 && (
        <ul className="flex flex-col border-t border-border lg:grid lg:grid-cols-cards lg:gap-8 lg:border-t-0">
          {articles.map((story, index) => (
            <li key={story.id} data-reveal className={cx('flex flex-col', ARTICLE_REVEAL[index])}>
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
