import { type ReactNode } from 'react'

import type { MediaImage } from '@/components/ui/Media'

import type { ArticlePageCopy } from './article-copy'

/*
 * The article page's props, independent of where the article comes from. A Sanity post
 * (src/sanity/article-view.ts) fills them today; an archive record can fill the same shape later,
 * passing its sanitized HTML as `body`. Every field the archive may lack is optional, and the page
 * leaves out what is missing.
 */

export type ArticleLink = { label: string; href: string | null }

export type ArticleCardView = {
  key: string
  href: string
  title: string
  /** The card's label above the title, the post's main topic. */
  label: string | null
  /** ISO date-time of publication. */
  publishedAt: string | null
  image: MediaImage | null
}

export type ArticleAuthorView = {
  name: string
  jobTitle: string | null
  city: string | null
  bio: string | null
  photo: MediaImage | null
}

export type ArticleView = {
  title: string
  standfirst: string | null
  /** ISO date-time of publication. */
  publishedAt: string | null
  category: ArticleLink | null
  topic: ArticleLink | null
  author: ArticleAuthorView | null
  hero: { image: MediaImage; credit: string | null } | null
  /** Rounded up, at least 1; null when the body has no text to count. */
  readingMinutes: number | null
  /** The rendered body: Portable Text for posts, sanitized HTML for archive records. */
  body: ReactNode
  /** Absolute URL the share buttons send. */
  shareUrl: string
  recommended: ArticleCardView[]
  mostRead: { title: string; items: ArticleCardView[] } | null
  /** The page's labels from the brand's "Article page" document, design texts where it is missing. */
  copy: ArticlePageCopy
}

const WORDS_PER_MINUTE = 200

/**
 * Reading time in minutes for a word count, or null for no words: ceil(words / 200), at least 1.
 * The one place the formula lives; callers count words of stega-clean text.
 */
export function readingMinutes(words: number): number | null {
  return words > 0 ? Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) : null
}

/** Words in a piece of plain text. */
export function countWords(text: string | null | undefined): number {
  return text ? text.split(/\s+/).filter(Boolean).length : 0
}
