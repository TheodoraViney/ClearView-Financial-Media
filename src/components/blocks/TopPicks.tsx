import { TopPicks as TopPicksSection, type TopPickItem } from '@/components/sections/TopPicks'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import { cardLabel, picksThenFill, toLinkProps, withHref } from './post-card'
import type { BlockProps } from './types'

/** Top Picks shows three (design). */
const COUNT = 3

type Pick = NonNullable<NonNullable<BlockProps<'topPicks'>['block']['posts']>[number]>

export function TopPicks({ block, brand }: BlockProps<'topPicks'>) {
  // A pick whose post got a sponsor after it was picked is dropped (the Studio flags it); the fill never has one.
  const picks = (block.posts ?? []).filter((post): post is Pick => post !== null && !post.sponsored)
  // Posts without a link (no slug) are dropped before the cut, so the next one takes the place.
  const items = picksThenFill(withHref(picks, brand), withHref(block.fill, brand), COUNT).map(
    (post): TopPickItem => ({
      key: post._id,
      href: post.href,
      title: post.title ?? '',
      ...cardLabel(post),
      summary: post.excerpt ?? null,
      image: toImage(post.image),
    }),
  )

  return <TopPicksSection heading={toHeading(block.heading)} link={toLinkProps(block.link, brand)} items={items} />
}
