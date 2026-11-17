import { stegaClean } from 'next-sanity'

import { CategoriesHeader } from '@/components/sections/categories/CategoriesHeader'
import { PAD } from '@/components/sections/categories/layout'
import { HeadingTopicHint } from '@/components/sections/categories/TopicHint.client'
import { PageHero as PageHeroSection } from '@/components/sections/PageHero'
import { toCategoriesHeading, type ArticleListingContext } from '@/sanity/categories-view'

import type { BlockProps } from './types'

/**
 * The page heading block: Home / current label, the H1 and an optional intro. All visible text is CMS copy.
 * On the Categories page (`articles`) the heading follows the list: a set category, or a single selected topic, takes
 * the H1 and the intro (when it has a description) and joins the breadcrumb after the page, which then links back.
 * While no topic is selected the H1 carries the articles list's "Select a topic" hint.
 */
export function PageHero({ block, articles }: BlockProps<'pageHero'> & { articles?: ArticleListingContext }) {
  if (articles) {
    const view = toCategoriesHeading(block, articles)

    return (
      <CategoriesHeader
        title={view.title}
        intro={view.intro}
        breadcrumb={view.breadcrumb}
        titleAside={
          view.topicHint ? <HeadingTopicHint label={view.topicHint.label} filterLabel={view.topicHint.filterLabel} /> : null
        }
        className={`${PAD} pt-8 md:pt-10`}
      />
    )
  }

  return (
    <PageHeroSection
      breadcrumb={[{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]}
      title={block.title ?? ''}
      intro={stegaClean(block.intro)?.trim() ? (block.intro ?? null) : null}
    />
  )
}
