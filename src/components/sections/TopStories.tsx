import { ArticleRow } from '@/components/ui/ArticleRow'

import { TopStoriesHero } from './TopStories.client'

export type TopStory = {
  id: string
  title: string
  href: string | null
  publication: string | null
  date: string | null
  shortDate: string | null
  excerpt: string | null
  image: { src: string; alt: string } | null
}

export type TopStoriesProps = {
  /** The link text on each slide, from the CMS. */
  linkLabel: string
  slides: TopStory[]
  articles: TopStory[]
}

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
          {articles.map((story) => (
            <li key={story.id} className="flex flex-col">
              <ArticleRow
                href={story.href}
                title={story.title}
                meta={[story.publication, story.shortDate].filter((item): item is string => Boolean(item))}
                image={story.image?.src}
                className="flex-1"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
