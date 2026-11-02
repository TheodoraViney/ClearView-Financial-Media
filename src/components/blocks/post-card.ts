import { stegaClean } from 'next-sanity'

import { isBrandKey, type BrandKey } from '@/brands'
import { formatMediumDate } from '@/lib/dates'
import { resolveHref, type ResolvableLink } from '@/lib/links'

/** The post fields every publication home card reads (POST_CARD). */
export type CardPost = {
  _id: string
  title: string | null
  slug: string | null
  brands: string[] | null
  publishedAt: string | null
  excerpt?: string | null
  category?: { title: string | null } | null
}

import { present } from '@/lib/picks'

export { picksThenFill, present } from '@/lib/picks'

/** The post's URL from this host: relative on its own brand, absolute to its brand's domain otherwise. */
export function postHref(post: CardPost, current: BrandKey): string | null {
  const brands = (post.brands ?? []).map((brand) => stegaClean(brand)).filter(isBrandKey)

  return resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, current)
}

/**
 * The published posts that have a URL from this host, each with its `href`. Applied to picks and fill before the
 * cut to the block's count, so a post without a link (no slug) frees its place instead of leaving a gap.
 */
export function withHref<T extends CardPost>(
  posts: (T | null | undefined)[] | null | undefined,
  current: BrandKey,
): (T & { href: string })[] {
  return present(posts).flatMap((post) => {
    const href = postHref(post, current)

    return href ? [{ ...post, href }] : []
  })
}

/** The card label parts on the publication homes: category (may be missing: not every post has one) and "28 Sep 2026". */
export function cardLabel(post: CardPost): { category: string | null; date: string | null } {
  const category = post.category?.title

  return {
    category: category && stegaClean(category).trim() ? category : null,
    date: formatMediumDate(stegaClean(post.publishedAt)),
  }
}

/** "category | date" as Meta items, the category left out when the post has none. */
export function cardMeta(post: CardPost): string[] {
  const { category, date } = cardLabel(post)

  return [category, date].filter((part): part is string => Boolean(part))
}

/** A link field as `{ href, label }`, or null when either is missing. */
export function toLinkProps(
  link: (ResolvableLink & { label?: string | null }) | null | undefined,
  brand: BrandKey,
): { href: string; label: string } | null {
  const href = resolveHref(link, brand)
  const label = link?.label

  return href && label && stegaClean(label).trim() ? { href, label } : null
}
