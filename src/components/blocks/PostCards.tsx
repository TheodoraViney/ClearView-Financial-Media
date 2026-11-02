import { PostCards as PostCardsSection, type PostCardItem } from '@/components/sections/PostCards'
import { toHeading } from '@/sanity/heading'

import { cardLabel, picksThenFill, toLinkProps, withHref } from './post-card'
import type { BlockProps } from './types'

/** News Analysis shows the latest three (design); POST_CARDS_COUNT in the schema. */
const COUNT = 3

export function PostCards({ block, brand }: BlockProps<'postCards'>) {
  const items = picksThenFill(withHref(block.posts, brand), withHref(block.latest, brand), COUNT).map(
    (post): PostCardItem => ({
      key: post._id,
      href: post.href,
      title: post.title ?? '',
      ...cardLabel(post),
      summary: post.excerpt ?? null,
    }),
  )

  return <PostCardsSection heading={toHeading(block.heading)} link={toLinkProps(block.link, brand)} items={items} />
}
