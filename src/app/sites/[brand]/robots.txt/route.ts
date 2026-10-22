import { brandOrigin, isBrandKey, isEditorialBrandKey } from '@/brands'

/**
 * `/robots.txt` per brand. Production lets crawlers in and names the archive
 * sitemap on the editorial brands; ClearView has no archive. Every other
 * environment (staging, previews, local) shuts crawlers out, so a vercel.app
 * host never competes with the live domain.
 */
export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/robots.txt'>) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const lines =
    process.env.NEXT_PUBLIC_SITE_ENV === 'production'
      ? [
          'User-agent: *',
          'Disallow: /api/',
          'Disallow: /studio',
          ...(isEditorialBrandKey(brand) ? ['', `Sitemap: ${brandOrigin(brand)}/archive/sitemap/index.xml`] : []),
        ]
      : ['User-agent: *', 'Disallow: /']

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
