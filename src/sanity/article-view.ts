import { stegaClean, type StegaBranded } from 'next-sanity'
import { type ReactNode } from 'react'

import { isBrandKey, type EditorialBrandKey } from '@/brands'
import {
  ARTICLE_PAGE_COPY_DEFAULTS,
  MOST_READ_COUNT,
  MOST_READ_TITLE_DEFAULT,
  type ArticlePageCopy,
} from '@/lib/article-copy'
import {
  countWords,
  readingMinutes,
  type ArticleCardView,
  type ArticleLink,
  type ArticleShareLinkView,
  type ArticleView,
} from '@/lib/article'
import { archiveCanonicalUrl, archivePlainText, type ArchiveRecord } from '@/lib/archive'
import { toAdUnitView, type AdUnitView } from '@/lib/gam'
import { absolutePostUrl, resolveHref } from '@/lib/links'
import { shareHref } from '@/lib/share-links'

import { toImage } from './image'
import type { MostReadAutoFill } from './most-read'
import type { ARTICLE_PAGE_QUERY_RESULT, MOST_READ_QUERY_RESULT, POST_QUERY_RESULT } from './types'

// Query results as cachedSanity returns them: strings may carry stega in draft mode.
type Post = StegaBranded<NonNullable<POST_QUERY_RESULT>>
type MostRead = StegaBranded<MOST_READ_QUERY_RESULT>
type PageCopy = StegaBranded<ARTICLE_PAGE_QUERY_RESULT>
type Card = Post['picks'][number]
type Body = NonNullable<Post['content']>

const RECOMMENDED_COUNT = 3

// Listing pages filter by these query parameters (one articles page, categories and topics as filters).
const listingHref = (filter: 'category' | 'topic', slug: string | null) =>
  slug ? `/articles?${filter}=${encodeURIComponent(stegaClean(slug))}` : null

function toLink(term: { title: string | null; slug: string | null } | null, filter: 'category' | 'topic'): ArticleLink | null {
  return term?.title ? { label: term.title, href: listingHref(filter, term.slug) } : null
}

function toCard(card: Card, brand: EditorialBrandKey): ArticleCardView | null {
  const brands = (card.brands ?? []).map((key) => stegaClean(key)).filter(isBrandKey)
  const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: card.slug, brands } }, brand)

  if (!href || !card.title) {
    return null
  }

  return {
    key: card._id,
    href,
    title: card.title,
    label: card.topic?.title ?? null,
    publishedAt: stegaClean(card.publishedAt) ?? null,
    image: toImage(card.image),
  }
}

/** Cards in the order of `ids` (the editor's order), dropping ids that did not resolve. */
function inOrder(ids: string[], cards: Card[]): Card[] {
  const byId = new Map(cards.map((card) => [card._id, card]))

  return ids.flatMap((id) => byId.get(id) ?? [])
}

/**
 * Most read: the editor's picks in their order, then the auto source for the empty places. The post being read
 * (`currentId`, none on an archive page) is left out and a post shows once.
 */
function mostReadCards(currentId: string | null, mostRead: MostRead, fill: StegaBranded<MostReadAutoFill>): Card[] {
  const picks = mostRead ? inOrder(mostRead.ids, mostRead.posts) : []
  const byId = new Map<string, Card>()

  for (const card of [...picks, ...fill]) {
    if (card._id !== currentId && !byId.has(card._id)) {
      byId.set(card._id, card)
    }
  }

  return [...byId.values()].slice(0, MOST_READ_COUNT)
}

// Draft mode embeds invisible stega characters in every string; they would count as words.
const words = (text: string | null | undefined) => countWords(stegaClean(text))

/** Words of the body's text: paragraphs and headings, quotes, fact boxes and infographic titles and descriptions. */
function bodyWords(body: Body | null): number {
  return (body ?? []).reduce((total, member) => {
    switch (member._type) {
      case 'block':
        return total + words((member.children ?? []).map((child) => child.text ?? '').join(''))
      case 'pullQuote':
        return total + words(member.quote)
      case 'factBox':
        return total + (member.facts ?? []).reduce((sum, fact) => sum + words(fact.label) + words(fact.value), 0)
      case 'infographic':
        return total + words(member.title) + words(member.description)
      default:
        return total
    }
  }, 0)
}

/** The brand's top and sidebar banner units. The in-content unit goes to the post body, which renders its banners. */
function toArticleAds(copy: PageCopy): ArticleView['ads'] {
  return { top: toAdUnitView(stegaClean(copy?.topAdUnit)), sidebar: toAdUnitView(stegaClean(copy?.sidebarAdUnit)) }
}

/** The brand's in-content banner unit, for the post body's `adBreak` banners. */
export function inContentAdUnit(copy: PageCopy): AdUnitView | null {
  return toAdUnitView(stegaClean(copy?.inContentAdUnit))
}

/** The brand's labels, each falling back to the design text while the document or the field is missing. */
function toCopy(copy: PageCopy): ArticlePageCopy {
  const keys = Object.keys(ARTICLE_PAGE_COPY_DEFAULTS) as (keyof ArticlePageCopy)[]

  return Object.fromEntries(keys.map((key) => [key, copy?.[key] || ARTICLE_PAGE_COPY_DEFAULTS[key]])) as ArticlePageCopy
}

// Icons are Sanity assets; anything else would land unchecked inside a CSS url().
const SANITY_ASSET_ORIGIN = 'https://cdn.sanity.io/'

/**
 * The brand's share rail networks in the editor's order. An item whose address is not https, or that lacks a label
 * or icon, is dropped: the Studio rule is not a guard, the Content API accepts writes that never ran it.
 */
function toShareLinks(copy: PageCopy, url: string, title: string): ArticleShareLinkView[] {
  if (!url) {
    return []
  }

  return (copy?.shareLinks ?? []).flatMap((item) => {
    // The label becomes the link's aria-label, so it must be free of stega characters.
    const label = stegaClean(item.label)?.trim()
    const href = shareHref(item.url, url, title)
    const iconSrc = stegaClean(item.icon?.asset?.url)

    return label && href && iconSrc?.startsWith(SANITY_ASSET_ORIGIN) ? [{ key: item._key, label, href, iconSrc }] : []
  })
}

/** A Sanity post as the article page's props. `body` is the rendered Portable Text. */
export function fromPost({
  post,
  mostRead,
  mostReadFill,
  copy,
  brand,
  body,
}: {
  post: Post
  mostRead: MostRead
  mostReadFill: StegaBranded<MostReadAutoFill>
  copy: PageCopy
  brand: EditorialBrandKey
  body: ReactNode
}): ArticleView {
  const image = toImage(post.image)
  const picks = inOrder(post.recommendedIds, post.picks)
  const pickIds = new Set(picks.map((card) => card._id))
  const recommended = [...picks, ...post.fill.filter((card) => !pickIds.has(card._id))]
    .slice(0, RECOMMENDED_COUNT)
    .map((card) => toCard(card, brand))
    .filter((card): card is ArticleCardView => card !== null)

  const shareUrl = post.slug ? absolutePostUrl(brand, post.slug) : ''

  return {
    title: post.title ?? '',
    standfirst: post.excerpt,
    publishedAt: stegaClean(post.publishedAt) ?? null,
    category: toLink(post.category, 'category'),
    topic: toLink(post.primaryTopic, 'topic'),
    author: post.author?.name
      ? {
          name: post.author.name,
          jobTitle: post.author.jobTitle,
          city: post.author.city,
          bio: post.author.bio,
          photo: toImage(post.author.photo),
        }
      : null,
    hero: image ? { image, credit: post.image?.credit ?? null } : null,
    readingMinutes: readingMinutes(bodyWords(post.content)),
    body,
    shareUrl,
    shareLinks: toShareLinks(copy, shareUrl, post.title ?? ''),
    recommended,
    mostRead: toMostRead(post._id, mostRead, mostReadFill, brand),
    copy: toCopy(copy),
    ads: toArticleAds(copy),
  }
}

function toMostRead(
  currentId: string | null,
  mostRead: MostRead,
  fill: StegaBranded<MostReadAutoFill>,
  brand: EditorialBrandKey,
): ArticleView['mostRead'] {
  const items = mostReadCards(currentId, mostRead, fill)
    .map((card) => toCard(card, brand))
    .filter((card): card is ArticleCardView => card !== null)

  return items.length > 0 ? { title: mostRead?.title || MOST_READ_TITLE_DEFAULT, items } : null
}

/** Archive media under `/archive-media/`, the only image source the archive page loads. */
const archiveMedia = (value: string | null | undefined) => (value?.startsWith('/archive-media/') ? value : null)

/**
 * An archived article as the article page's props. `body` is the rendered archive HTML. Everything the record lacks
 * stays empty and the page leaves it out:
 * - no category or topic until the client approves the mapping from legacy categories, so the breadcrumb is Home only;
 * - the author is the byline only (name, job title, city): the legacy company has no place in the design, and the
 *   legacy photos sit on the old domains, not in the archive;
 * - no Recommended articles.
 */
export function fromArchiveRecord({
  record,
  mostRead,
  mostReadFill,
  copy,
  brand,
  logo,
  body,
}: {
  record: ArchiveRecord
  mostRead: MostRead
  mostReadFill: StegaBranded<MostReadAutoFill>
  copy: PageCopy
  brand: EditorialBrandKey
  /** The brand logo for the grey plate in the hero's place when the record has no image. */
  logo: { src: string; width: number; height: number } | null
  body: ReactNode
}): ArticleView {
  const image = archiveMedia(record.media.image)
  const shareUrl = archiveCanonicalUrl(record, brand)
  const author = record.author

  return {
    title: record.title,
    standfirst: record.standfirst,
    publishedAt: record.date,
    category: null,
    topic: null,
    author: author?.name
      ? { name: author.name, jobTitle: author.jobTitle, city: author.location, bio: null, photo: null }
      : null,
    // Archive media has no stored size. The hero box is `fill` and never reads it.
    hero: image ? { image: { src: image, width: 0, height: 0, alt: '' }, credit: null } : null,
    heroPlaceholder: logo,
    readingMinutes: readingMinutes(countWords(archivePlainText(record.bodyHtml ?? ''))),
    body,
    shareUrl,
    shareLinks: toShareLinks(copy, shareUrl, record.title),
    recommended: [],
    mostRead: toMostRead(null, mostRead, mostReadFill, brand),
    copy: toCopy(copy),
    ads: toArticleAds(copy),
  }
}
