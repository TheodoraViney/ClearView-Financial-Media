import { stegaClean } from 'next-sanity'

import { PostBriefs as PostBriefsSection } from '@/components/sections/PostBriefs'
import { toHeading } from '@/sanity/heading'

import { cardLabel, picksThenFill, postHref, toLinkProps } from './post-card'
import type { BlockProps } from './types'

/** Rows when the block's count is empty or out of range: the most the design draws (POST_BRIEFS_MAX in the schema). */
const MAX = 6

function rowCount(count: number | null | undefined): number {
  const value = stegaClean(count)

  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? Math.min(value, MAX) : MAX
}

type BriefPost = Parameters<typeof cardLabel>[0] & { topic?: { title: string | null } | null }

function briefMeta(post: BriefPost): string[] {
  const { category, date } = cardLabel(post)
  const topic = post.topic?.title && stegaClean(post.topic.title).trim() ? post.topic.title : null

  return [topic ?? category, date].filter((part): part is string => Boolean(part))
}

export function PostBriefs({ block, brand }: BlockProps<'postBriefs'>) {
  const items = picksThenFill(block.posts, block.latest, rowCount(block.count)).map((post) => {
    // The brief as written or generated in Studio; an empty brief shows the standfirst. No text hides it, the row still shows.
    const text = post.briefText && stegaClean(post.briefText).trim() ? post.briefText : post.excerpt

    return {
      key: post._id,
      href: postHref(post, brand),
      title: post.title ?? '',
      // The main topic labels a brief; the category when the post has none.
      meta: briefMeta(post),
      text: text || null,
    }
  })

  return <PostBriefsSection heading={toHeading(block.heading)} link={toLinkProps(block.link, brand)} items={items} />
}
