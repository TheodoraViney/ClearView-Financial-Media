import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveBrandFromHost, type BrandKey } from '@/brands'

import { ARCHIVE_SITEMAP_DIR, type ArchiveSitemapIndex } from './archive-sitemap'

/*
 * Per-domain XML sitemaps. `/sitemap.xml` on each brand host is a sitemap index naming the brand's CMS sitemap files
 * (`/sitemap/{n}.xml`, src/sanity/sitemap.ts) and its archive sitemap files (`/archive/sitemap/{n}.xml`, editorial
 * brands only). Every URL is absolute on `brandOrigin()`, as the canonical tags are.
 */

/** URLs per CMS sitemap file. Google accepts 50,000; smaller files keep each response quick. */
export const CMS_SITEMAP_FILE_SIZE = 10_000

/** One sitemap URL: the absolute address and its last modification (ISO date-time), if known. */
export type SitemapUrl = { loc: string; lastmod: string | null }

/** `{n}.xml` with n a plain non-negative integer, as both sitemap families name their files. */
export const SITEMAP_FILE = /^(0|[1-9]\d{0,3})\.xml$/

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ENTITIES[c])
}

function lastmodTag(date: string | null): string {
  return date ? `<lastmod>${escapeXml(date)}</lastmod>` : ''
}

/** A `<urlset>` document. */
export function urlsetXml(urls: SitemapUrl[]): string {
  const items = urls.map(({ loc, lastmod }) => `<url><loc>${escapeXml(loc)}</loc>${lastmodTag(lastmod)}</url>`)

  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>`
}

/** A `<sitemapindex>` document. */
export function sitemapIndexXml(files: SitemapUrl[]): string {
  const items = files.map(({ loc, lastmod }) => `<sitemap><loc>${escapeXml(loc)}</loc>${lastmodTag(lastmod)}</sitemap>`)

  return `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>`
}

export function xmlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}

export function notFoundResponse(): Response {
  return new Response('Not found\n', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/** The newest of the given ISO dates, or null. ISO strings of one format sort as text. */
export function newest(...dates: (string | null | undefined)[]): string | null {
  return dates.reduce<string | null>((max, date) => (date && (!max || date > max) ? date : max), null)
}

/**
 * Whether an editor's canonical override still names the page itself: on any host of the same brand (live, staging or
 * local, so a production URL typed in Sanity matches on staging too) and the same path. Empty counts as itself. A page
 * whose canonical names another URL stays out of the sitemap, which lists canonical URLs only.
 */
export function isSelfCanonical(canonical: string | null | undefined, brand: BrandKey, pagePath: string): boolean {
  const value = canonical?.trim()

  if (!value) {
    return true
  }

  let url: URL

  try {
    url = new URL(value)
  } catch {
    // pageMetadata ignores a value that is not an https URL, so the page stays its own canonical.
    return true
  }

  if (url.protocol !== 'https:') {
    return true
  }

  const trimmed = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p)

  return resolveBrandFromHost(url.host) === brand && safeDecode(trimmed(url.pathname)) === safeDecode(trimmed(pagePath))
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * An editorial brand's archive sitemap data from `data/archive-sitemap/`, built by `pnpm sitemap:build` and shipped
 * through `outputFileTracingIncludes` in next.config. Null when the file is missing.
 */
export async function readArchiveSitemapData<T>(...segments: string[]): Promise<T | null> {
  try {
    // The ignore comment stops the bundler from tracing the whole project for this dynamic path.
    const text = await readFile(path.join(/* turbopackIgnore: true */ process.cwd(), ARCHIVE_SITEMAP_DIR, ...segments), 'utf8')

    return JSON.parse(text) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export const readArchiveSitemapIndex = (brand: BrandKey) => readArchiveSitemapData<ArchiveSitemapIndex>(brand, 'index.json')
