import { cache } from 'react'

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
 * The record for a legacy id, or null when the archive has none. Any other
 * failure throws.
 *
 * Fetched once per request: `cache()` shares it between the metadata and the
 * page. It is deliberately not `'use cache'`. The default in-memory handler
 * keeps each entry's render context alive, about 0.9 MB per article against
 * the few KB it counts, so a crawl through 100k articles exhausts the
 * instance's memory long before the LRU evicts anything.
 */
export const getArchiveRecord = cache(async (id: number): Promise<ArchiveRecord | null> => {
  if (!ARCHIVE_ID.test(String(id))) {
    return null
  }

  const response = await fetch(`${archiveOrigin()}/records/${id}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Archive record ${id}: HTTP ${response.status}`)
  }

  return (await response.json()) as ArchiveRecord
})

/** Canonical path of an archived article. The id identifies it; the slug is cosmetic. */
export function archiveArticlePath(record: Pick<ArchiveRecord, 'id' | 'slug'>): string {
  return `/archive/${record.id}/${encodeURIComponent(record.slug)}`
}
