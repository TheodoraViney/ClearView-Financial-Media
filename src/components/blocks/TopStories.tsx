import { stegaClean } from 'next-sanity'

import { BRANDS, isBrandKey, type BrandKey } from '@/brands'
import { TopStories as TopStoriesSection, type TopStory } from '@/components/sections/TopStories'
import { formatLongDate, formatShortDate } from '@/lib/dates'
import { resolveHref } from '@/lib/links'
import { urlFor } from '@/sanity/image'

import type { BlockProps } from './types'

const SLIDE_COUNT = 3
const ARTICLE_COUNT = 3

type Post = NonNullable<NonNullable<BlockProps<'topStories'>['block']['latest']>[number]>

// The post's own brand when it runs on the current host, otherwise the first one: the same brand resolveHref links to.
function publicationOf(brands: BrandKey[], current: BrandKey): BrandKey | null {
  return brands.includes(current) ? current : (brands[0] ?? null)
}

function toStory(post: Post, current: BrandKey, imageWidth: number): TopStory {
  const brands = (post.brands ?? []).map((brand) => stegaClean(brand)).filter(isBrandKey)
  const publication = publicationOf(brands, current)
  const publishedAt = stegaClean(post.publishedAt)

  return {
    id: post._id,
    title: post.title ?? '',
    href: resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, current),
    publication: publication ? BRANDS[publication].title : null,
    date: formatLongDate(publishedAt),
    shortDate: formatShortDate(publishedAt),
    excerpt: post.excerpt ?? null,
    image: post.image?.asset
      ? {
          src: urlFor(post.image).width(imageWidth).fit('max').auto('format').url(),
          alt: stegaClean(post.image.alt) || (post.title ?? ''),
        }
      : null,
  }
}

export function TopStories({ block, brand }: BlockProps<'topStories'>) {
  // Picks pointing at unpublished or deleted posts dereference to null.
  const picked = <T,>(posts: (T | null)[] | null | undefined) => (posts ?? []).filter((post): post is T => post !== null)

  const latest = picked(block.latest)
  const slides = picked(block.slides).slice(0, SLIDE_COUNT)
  const fillSlides = latest.slice(0, SLIDE_COUNT - slides.length)
  const articles = picked(block.articles).slice(0, ARTICLE_COUNT)
  const fillArticles = latest.slice(fillSlides.length, fillSlides.length + ARTICLE_COUNT - articles.length)

  return (
    <TopStoriesSection
      linkLabel={block.linkLabel ?? ''}
      slides={[...slides, ...fillSlides].map((post) => toStory(post, brand, 1600))}
      articles={[...articles, ...fillArticles].map((post) => toStory(post, brand, 160))}
    />
  )
}
