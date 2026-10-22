import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { brandOrigin, isEditorialBrandKey } from '@/brands'
import { archiveArticlePath } from '@/lib/archive'
import { ARCHIVE_SITEMAP_DIR, type ArchiveSitemapEntry, type ArchiveSitemapIndex } from '@/lib/archive-sitemap'

/**
 * The archive sitemap of an editorial brand: `/archive/sitemap/index.xml`
 * lists the files, `/archive/sitemap/{n}.xml` lists the articles whose
 * canonical home is this brand. URLs use `brandOrigin()`, as the canonical
 * tag does, so the two always agree.
 *
 * The data comes from `data/archive-sitemap/`, built by `pnpm sitemap:build`
 * and shipped through `outputFileTracingIncludes` in next.config.
 */

const SITEMAP_FILE = /^(0|[1-9]\d{0,3})\.xml$/

async function readData<T>(...segments: string[]): Promise<T | null> {
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

export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/archive/sitemap/[file]'>) {
  const { brand, file } = await params

  if (!isEditorialBrandKey(brand)) {
    return notFound()
  }

  const origin = brandOrigin(brand)

  if (file === 'index.xml') {
    const index = await readData<ArchiveSitemapIndex>(brand, 'index.json')

    if (!index) {
      return notFound()
    }

    const items = index.files.map(
      ({ lastmod }, n) => `<sitemap><loc>${escape(`${origin}/archive/sitemap/${n}.xml`)}</loc>${lastmodTag(lastmod)}</sitemap>`,
    )

    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>`)
  }

  const n = SITEMAP_FILE.exec(file)?.[1]
  const entries = n === undefined ? null : await readData<ArchiveSitemapEntry[]>(brand, `${n}.json`)

  if (!entries) {
    return notFound()
  }

  const items = entries.map(
    ([id, slug, date]) => `<url><loc>${escape(`${origin}${archiveArticlePath({ id, slug })}`)}</loc>${lastmodTag(date)}</url>`,
  )

  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>`)
}

function lastmodTag(date: string | null): string {
  return date ? `<lastmod>${escape(date)}</lastmod>` : ''
}

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ENTITIES[c])
}

function xml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}

function notFound(): Response {
  return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
