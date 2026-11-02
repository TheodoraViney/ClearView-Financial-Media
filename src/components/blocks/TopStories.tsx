import { stegaClean } from 'next-sanity'

import { isBrandKey, type BrandKey } from '@/brands'
import { TopStories as TopStoriesSection, type TopStory } from '@/components/sections/TopStories'
import { formatLongDate, formatShortDate } from '@/lib/dates'
import { resolveHref } from '@/lib/links'
import { topStoriesSplit } from '@/lib/picks'
import { brandTitleIn } from '@/sanity/brand-title'
import { toImage } from '@/sanity/image'

import { cardLabel } from './post-card'
import type { BlockProps } from './types'

// ClearView runs up to three lead stories as a slider; a publication home shows one (Studio validation says the same).
const slideCount = (brand: BrandKey) => (brand === 'clearview' ? 3 : 1)
const ARTICLE_COUNT = 3

type Post = NonNullable<NonNullable<BlockProps<'topStories'>['block']['latest']>[number]>

// The post's own brand when it runs on the current host, otherwise the first one: the same brand resolveHref links to.
export function publicationOf(brands: BrandKey[], current: BrandKey): BrandKey | null {
  return brands.includes(current) ? current : (brands[0] ?? null)
}

function toStory(post: Post, current: BrandKey): TopStory {
  const brands = (post.brands ?? []).map((brand) => stegaClean(brand)).filter(isBrandKey)
  const publication = publicationOf(brands, current)
  const publishedAt = stegaClean(post.publishedAt)
  const image = toImage(post.image)
  // Publication homes label by category ("28 Sep 2026"); ClearView keeps the publication and its own date formats.
  const label = cardLabel(post)

  return {
    id: post._id,
    title: post.title ?? '',
    href: resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, current),
    publication: publication ? brandTitleIn(post.brandTitles, publication) : null,
    date: formatLongDate(publishedAt),
    shortDate: formatShortDate(publishedAt),
    category: label.category,
    mediumDate: label.date,
    excerpt: post.excerpt ?? null,
    image: image && { ...image, alt: image.alt || (post.title ?? '') },
  }
}

export function TopStories({ block, brand }: BlockProps<'topStories'>) {
  // Picks pointing at unpublished or deleted posts dereference to null and are dropped (shared with the Studio panel).
  const { pickedSlides: slides, fillSlides, pickedArticles: articles, fillArticles } = topStoriesSplit(
    block.slides,
    block.articles,
    block.latest,
    slideCount(brand),
    ARTICLE_COUNT,
  )

  return (
    <TopStoriesSection
      look={brand === 'clearview' ? 'group' : 'publication'}
      label={block.label}
      linkLabel={block.linkLabel ?? ''}
      slides={[...slides, ...fillSlides].map((post) => toStory(post, brand))}
      articles={[...articles, ...fillArticles].map((post) => toStory(post, brand))}
    />
  )
}
