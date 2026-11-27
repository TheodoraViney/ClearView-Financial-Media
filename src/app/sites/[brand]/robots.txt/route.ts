import { brandOrigin, isBrandKey } from '@/brands'

/**
 * AI crawlers named in a group of their own, so their access is explicit rather than implied by `*`: OpenAI,
 * Anthropic, Perplexity, Google's and Apple's AI training controls, and Common Crawl. A named group replaces the `*`
 * group for that crawler, so it repeats the same rules.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

/**
 * Paths no crawler needs: the API, the Studio, the search results page (also noindex) and the internal `/sites`
 * prefix (a 404 anyway). Exact or prefix-with-slash forms, so a page slug that merely starts with one stays open.
 */
const DISALLOW = ['/api/', '/studio$', '/studio/', '/search$', '/search?', '/sites/']

/**
 * `/robots.txt` per brand. Production lets every crawler in, AI crawlers named explicitly, keeps them out of the
 * non-public paths and names the brand's sitemap index. Every other environment (staging, previews, local) shuts
 * crawlers out, so a vercel.app host never competes with the live domain.
 */
export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/robots.txt'>) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const rules = ['Allow: /', ...DISALLOW.map((path) => `Disallow: ${path}`)]
  const lines =
    process.env.NEXT_PUBLIC_SITE_ENV === 'production'
      ? [
          'User-agent: *',
          ...rules,
          '',
          ...AI_CRAWLERS.map((agent) => `User-agent: ${agent}`),
          ...rules,
          '',
          `Sitemap: ${brandOrigin(brand)}/sitemap.xml`,
        ]
      : ['User-agent: *', 'Disallow: /']

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
