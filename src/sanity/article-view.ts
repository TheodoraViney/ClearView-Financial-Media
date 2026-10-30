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
  type ArticleView,
} from '@/lib/article'
import { absolutePostUrl, resolveHref } from '@/lib/links'

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
 * Most read: the editor's picks in their order, then the auto source for the empty places. The article being read is
 * left out and a post shows once.
 */
function mostReadCards(post: Post, mostRead: MostRead, fill: StegaBranded<MostReadAutoFill>): Card[] {
  const picks = mostRead ? inOrder(mostRead.ids, mostRead.posts) : []
  const byId = new Map<string, Card>()

  for (const card of [...picks, ...fill]) {
    if (card._id !== post._id && !byId.has(card._id)) {
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

/** The brand's labels, each falling back to the design text while the document or the field is missing. */
function toCopy(copy: PageCopy): ArticlePageCopy {
  const keys = Object.keys(ARTICLE_PAGE_COPY_DEFAULTS) as (keyof ArticlePageCopy)[]

  return Object.fromEntries(keys.map((key) => [key, copy?.[key] || ARTICLE_PAGE_COPY_DEFAULTS[key]])) as ArticlePageCopy
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

  const mostReadItems = mostReadCards(post, mostRead, mostReadFill)
    .map((card) => toCard(card, brand))
    .filter((card): card is ArticleCardView => card !== null)

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
    shareUrl: post.slug ? absolutePostUrl(brand, post.slug) : '',
    recommended,
    mostRead:
      mostReadItems.length > 0 ? { title: mostRead?.title || MOST_READ_TITLE_DEFAULT, items: mostReadItems } : null,
    copy: toCopy(copy),
  }
}
