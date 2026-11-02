import { WeeklyRoundup as WeeklyRoundupSection } from '@/components/sections/WeeklyRoundup'
import { formatDay, lastFriday } from '@/lib/dates'
import { toHeading } from '@/sanity/heading'

import { cardMeta, picksThenFill, postHref, toLinkProps } from './post-card'
import type { BlockProps } from './types'

/** "In this edition" lists four posts (design). */
const COUNT = 4

/**
 * `today` is the UK date the page query ran with (`$today`, hourly cache): the edition date is the last Friday on or
 * before it, so it rolls over within an hour of UK midnight on Friday.
 */
export function WeeklyRoundup({ block, brand, today }: BlockProps<'weeklyRoundup'> & { today: string }) {
  const items = picksThenFill(block.posts, block.latest, COUNT).map((post) => ({
    key: post._id,
    href: postHref(post, brand),
    title: post.title ?? '',
    meta: cardMeta(post),
  }))

  return (
    <WeeklyRoundupSection
      heading={toHeading(block.heading)}
      label={block.label ?? null}
      date={formatDay(lastFriday(today))}
      title={block.title ?? null}
      summary={block.summary ?? null}
      button={toLinkProps(block.button, brand)}
      listLabel={block.listLabel ?? null}
      items={items}
    />
  )
}
