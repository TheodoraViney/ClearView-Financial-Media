import { cacheLife, cacheTag } from 'next/cache'

import { brandScopedHref } from '@/lib/links'
import type { BrandKey } from '@/brands'

/**
 * Legacy archive articles, read from the archive Worker in front of R2.
 *
 * `ARCHIVE_ORIGIN` is the Worker's origin with no trailing slash. The Worker
 * serves `/records/{id}` as JSON (404 when unknown) and `/media/{path}`, which
 * next.config exposes as `/archive-media/{path}`.
 */

/** Legacy ids are positive integers; the Worker applies the same cap. */
const ARCHIVE_ID = /^[1-9]\d{0,8}$/

/** The id from a URL segment, or null for anything that is not a plain legacy id. */
export function parseArchiveId(value: string | null | undefined): number | null {
  return value && ARCHIVE_ID.test(value) ? Number(value) : null
}

export type ArchiveAttachment = {
  filename: string | null
  filetype: string | null
  filesize: number | null
  path: string | null
}

/** Event fields of an event-type article. The HTML fields went through the export allowlist. */
export type ArchiveEvent = {
  venue: string | null
  time: string | null
  endDate: string | null
  agenda: string | null
  speakers: string | null
  sponsors: string | null
  [key: string]: unknown
}

/**
 * One archived article as the export writes it. Only the fields the site uses
 * are typed. `author.jobTitle` and `author.company` exist but are never rendered.
 */
export type ArchiveRecord = {
  id: number
  slug: string
  title: string
  standfirst: string | null
  bodyHtml: string
  /** Editorial date, "2020-01-31", or null. */
  date: string | null
  /** Brand keys that publish the article. The first is its canonical home. */
  publications: string[]
  /** Type label per brand, such as "Breaking News". */
  types: Record<string, string>
  author: { name: string | null; [key: string]: unknown } | null
  media: {
    /** `/archive-media/...` or an external https URL. */
    image: string | null
    /** Vimeo video id. */
    videoId: string | null
    attachment: ArchiveAttachment | null
    [key: string]: unknown
  }
  event: ArchiveEvent | null
  [key: string]: unknown
}

function archiveOrigin(): string {
  const origin = process.env.ARCHIVE_ORIGIN

  if (!origin) {
    throw new Error('ARCHIVE_ORIGIN is not set')
  }

  return origin.replace(/\/+$/, '')
}

/**
 * The record for a legacy id, or null when the archive has none.
 *
 * Records never change once exported (a new export writes new objects), so a
 * hit is cached with the longest profile and tagged per id for a manual purge.
 * A miss is cached for an hour only, so an id added by a later export shows up
 * without a deploy. Any other failure throws and is not cached.
 */
export async function getArchiveRecord(id: number): Promise<ArchiveRecord | null> {
  'use cache'
  cacheTag('archive', `archive:${id}`)

  if (!ARCHIVE_ID.test(String(id))) {
    cacheLife('max')
    return null
  }

  const response = await fetch(`${archiveOrigin()}/records/${id}`)

  if (response.status === 404) {
    cacheLife('hours')
    return null
  }

  if (!response.ok) {
    throw new Error(`Archive record ${id}: HTTP ${response.status}`)
  }

  cacheLife('max')

  return (await response.json()) as ArchiveRecord
}

/** Canonical path of an archived article. The id identifies it; the slug is cosmetic. */
export function archiveArticlePath(record: Pick<ArchiveRecord, 'id' | 'slug'>): string {
  return `/archive/${record.id}/${encodeURIComponent(record.slug)}`
}

/**
 * Internal archive links exactly as the export writes them: the href, then the
 * target's brand keys. Only this form is rewritten; it is our own output.
 */
const ARCHIVE_LINK = /<a href="(\/archive\/[1-9]\d{0,8}\/[a-z0-9-]*)" data-pub="([a-z]+(?: [a-z]+)*)">/g

/**
 * Points each internal archive link at a brand that serves its target: relative
 * when the current brand publishes it, else absolute on the target's first
 * brand, the same rule as `resolveHref` for posts. `data-pub` is removed. A link
 * whose brands are all unknown keeps its relative href.
 */
export function rewriteArchiveLinks(html: string, currentBrand: BrandKey): string {
  return html.replace(ARCHIVE_LINK, (_match, path: string, brands: string) => {
    const href = brandScopedHref(path, brands.split(' '), currentBrand) ?? path

    return `<a href="${href}">`
  })
}
