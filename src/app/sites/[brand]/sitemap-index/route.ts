import { brandOrigin, isBrandKey, isEditorialBrandKey } from '@/brands'
import {
  CMS_SITEMAP_FILE_SIZE,
  newest,
  notFoundResponse,
  readArchiveSitemapIndex,
  sitemapIndexXml,
  xmlResponse,
  type SitemapUrl,
} from '@/lib/sitemap'
import { cmsSitemapUrls } from '@/sanity/sitemap'

/**
 * `/sitemap.xml` per brand host: the sitemap index of the brand's CMS sitemap files (`/sitemap/{n}.xml`) and, on the
 * editorial brands, its archive sitemap files (`/archive/sitemap/{n}.xml`). Each file holds at most 10,000 URLs.
 * The proxy rewrites `/sitemap.xml` here: a `sitemap.xml` folder is a Next metadata route, which the build prerenders
 * with a placeholder param and Vercel never routes to.
 */
export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/sitemap-index'>) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return notFoundResponse()
  }

  const origin = brandOrigin(brand)
  const [urls, archive] = await Promise.all([
    cmsSitemapUrls(brand),
    isEditorialBrandKey(brand) ? readArchiveSitemapIndex(brand) : null,
  ])

  const files: SitemapUrl[] = []

  for (let start = 0, n = 0; start < urls.length; start += CMS_SITEMAP_FILE_SIZE, n += 1) {
    const chunk = urls.slice(start, start + CMS_SITEMAP_FILE_SIZE)

    files.push({ loc: `${origin}/sitemap/${n}.xml`, lastmod: newest(...chunk.map((url) => url.lastmod)) })
  }

  for (const [n, { lastmod }] of (archive?.files ?? []).entries()) {
    files.push({ loc: `${origin}/archive/sitemap/${n}.xml`, lastmod })
  }

  return xmlResponse(sitemapIndexXml(files))
}
