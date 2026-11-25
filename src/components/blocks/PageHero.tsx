import { CategoriesHeader } from '@/components/sections/categories/CategoriesHeader'
import { PAD } from '@/components/sections/categories/layout'
import { HeadingTopicHint } from '@/components/sections/categories/TopicHint.client'
import { PageHero as PageHeroSection } from '@/components/sections/PageHero'
import { toCategoriesHeading, type ArticleListingContext } from '@/sanity/categories-view'
import type { CompanyEngagementContext } from '@/sanity/company-engagement-view'
import { toHeroIntro } from '@/sanity/page-hero'

import type { BlockProps } from './types'

/**
 * The page heading block: Home / current label, the H1 and the intro (rich text). All visible text is CMS copy.
 * On the Categories page (`articles`) the heading follows the list: a set category, or a single selected topic, takes
 * the H1 and the intro (when it has a description) and joins the breadcrumb after the page, which then links back.
 * While no topic is selected the H1 carries the articles list's "Select a topic" hint.
 * On the Company Engagement page (`companies`) it heads the page itself, under the route's Top banner.
 * Without the breadcrumb (Show breadcrumb off) the H1 takes its place.
 */
export function PageHero({
  block,
  articles,
  companies,
}: BlockProps<'pageHero'> & { articles?: ArticleListingContext; companies?: CompanyEngagementContext }) {
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

  const hero = (
    <PageHeroSection
      breadcrumb={
        block.showBreadcrumb === false
          ? undefined
          : [{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]
      }
      title={block.title ?? ''}
      intro={toHeroIntro(block.intro)}
    />
  )

  // PageHero tops its own 8 up to 32 on mobile; 40 above it from md.
  return companies ? <div className="pt-6 md:pt-8 lg:pt-10">{hero}</div> : hero
}
