import { stegaClean } from 'next-sanity'

import { BRANDS, isBrandKey, type BrandKey } from '@/brands'
import {
  FeaturedStories as FeaturedStoriesSection,
  type FeaturedStory,
} from '@/components/sections/FeaturedStories'
import { resolveHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'
import { urlFor } from '@/sanity/image'

import { publicationOf } from './TopStories'
import type { BlockProps } from './types'

const POST_COUNT = 4

// A card is a quarter of the page on desktop and full width on mobile; twice a ~400px card for 2x screens.
const IMAGE_WIDTH = 800

type Post = NonNullable<NonNullable<BlockProps<'featuredStories'>['block']['posts']>[number]>

function toStory(post: Post, current: BrandKey): FeaturedStory | null {
  const brands = (post.brands ?? []).map((brand) => stegaClean(brand)).filter(isBrandKey)
  // Cross-brand posts link absolutely to their own brand's domain.
  const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, current)

  if (!href) {
    return null
  }

  const publication = publicationOf(brands, current)

  return {
    key: post._id,
    href,
    title: post.title ?? '',
    publication: publication ? BRANDS[publication].title : null,
    publishedAt: stegaClean(post.publishedAt) ?? null,
    image: post.image?.asset
      ? {
          src: urlFor(post.image).width(IMAGE_WIDTH).fit('max').auto('format').url(),
          alt: stegaClean(post.image.alt) ?? '',
        }
      : null,
  }
}

export function FeaturedStories({ block, brand, now }: BlockProps<'featuredStories'> & { now: string }) {
  // Picks pointing at unpublished or deleted posts dereference to null. No fill: the block shows what the editor picked.
  const items = (block.posts ?? [])
    .filter((post): post is Post => post !== null)
    .slice(0, POST_COUNT)
    .map((post) => toStory(post, brand))
    .filter((item): item is FeaturedStory => item !== null)

  const linkHref = resolveHref(block.link, brand)
  const linkLabel = block.link?.label

  return (
    <FeaturedStoriesSection
      heading={toHeading(block.heading)}
      link={linkHref && linkLabel ? { href: linkHref, label: linkLabel } : null}
      items={items}
      now={now}
    />
  )
}
