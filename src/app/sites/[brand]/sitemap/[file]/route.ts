import { isBrandKey } from '@/brands'
import { CMS_SITEMAP_FILE_SIZE, notFoundResponse, SITEMAP_FILE, urlsetXml, xmlResponse } from '@/lib/sitemap'
import { cmsSitemapUrls } from '@/sanity/sitemap'

/** One CMS sitemap file of a brand, `/sitemap/{n}.xml`: the n-th slice of its URLs, as `/sitemap.xml` names them. */
export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/sitemap/[file]'>) {
  const { brand, file } = await params
  const n = SITEMAP_FILE.exec(file)?.[1]

  if (!isBrandKey(brand) || n === undefined) {
    return notFoundResponse()
  }

  const start = Number(n) * CMS_SITEMAP_FILE_SIZE
  const urls = (await cmsSitemapUrls(brand)).slice(start, start + CMS_SITEMAP_FILE_SIZE)

  // The first file always answers, even empty, so the index never names a 404; later ones exist only with URLs.
  if (urls.length === 0 && start > 0) {
    return notFoundResponse()
  }

  return xmlResponse(urlsetXml(urls))
}
