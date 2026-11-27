import { brandOrigin, isEditorialBrandKey } from '@/brands'
import { archiveArticlePath } from '@/lib/archive'
import { type ArchiveSitemapEntry } from '@/lib/archive-sitemap'
import {
  notFoundResponse,
  readArchiveSitemapData,
  readArchiveSitemapIndex,
  SITEMAP_FILE,
  sitemapIndexXml,
  urlsetXml,
  xmlResponse,
} from '@/lib/sitemap'

/**
 * The archive sitemap of an editorial brand: `/archive/sitemap/{n}.xml` lists the articles whose canonical home is
 * this brand, and `/sitemap.xml` names each file. `/archive/sitemap/index.xml` lists the archive files alone.
 * URLs use `brandOrigin()`, as the canonical tag does, so the two always agree.
 *
 * The data comes from `data/archive-sitemap/`, built by `pnpm sitemap:build` and shipped through
 * `outputFileTracingIncludes` in next.config.
 */
export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/archive/sitemap/[file]'>) {
  const { brand, file } = await params

  if (!isEditorialBrandKey(brand)) {
    return notFoundResponse()
  }

  const origin = brandOrigin(brand)

  if (file === 'index.xml') {
    const index = await readArchiveSitemapIndex(brand)

    if (!index) {
      return notFoundResponse()
    }

    return xmlResponse(
      sitemapIndexXml(index.files.map(({ lastmod }, n) => ({ loc: `${origin}/archive/sitemap/${n}.xml`, lastmod }))),
    )
  }

  const n = SITEMAP_FILE.exec(file)?.[1]
  const entries = n === undefined ? null : await readArchiveSitemapData<ArchiveSitemapEntry[]>(brand, `${n}.json`)

  if (!entries) {
    return notFoundResponse()
  }

  return xmlResponse(
    urlsetXml(entries.map(([id, slug, date]) => ({ loc: `${origin}${archiveArticlePath({ id, slug })}`, lastmod: date }))),
  )
}
