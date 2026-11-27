import { brandOrigin, isBrandKey, isEditorialBrandKey } from '@/brands'
import { resolveHref, sharedRecordHref, type ResolvableLink } from '@/lib/links'
import { fetchShell } from '@/sanity/brand-title'
import { cachedSanity, cachedUkToday } from '@/sanity/live'
import { LLMS_QUERY } from '@/sanity/queries'
import { fetchBrandSeo, plainText, SEO_FETCH } from '@/sanity/seo'

/**
 * `/llms.txt` per brand (llmstxt.org): the brand title, its search description from Brand settings, then links from
 * published content only: the header navigation, and the latest posts this brand is the canonical home of (editorial
 * brands) or the awards open for entries, upcoming events and latest research (ClearView), then the sitemap index.
 * Sections without links are left out. Cached like the pages: cachedSanity, the shell cache entry and the UK date.
 */
export async function GET(_request: Request, { params }: RouteContext<'/sites/[brand]/llms.txt'>) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const origin = brandOrigin(brand)
  const [seo, { data: shell }, { data }] = await Promise.all([
    fetchBrandSeo(brand),
    fetchShell(brand, SEO_FETCH),
    cachedUkToday().then((today) => cachedSanity({ query: LLMS_QUERY, params: { brand, today }, ...SEO_FETCH })),
  ])

  const absolute = (href: string | null): string | null => {
    const url = href?.startsWith('/') ? `${origin}${href}` : href

    // A home page reads as the bare origin, as in its canonical tag and the sitemap.
    return url && /^https?:\/\//.test(url) ? url.replace(/^(https?:\/\/[^/]+)\/$/, '$1') : null
  }

  const navigation = (shell.header?.navigation ?? []).flatMap((item) =>
    item._type === 'navGroup'
      ? (item.links ?? []).map((link) => ({ label: link.label, href: link.link, note: item.label }))
      : [{ label: item.label, href: item.link, note: null }],
  )

  const sections: [string, string[]][] = [
    [
      'Navigation',
      navigation.flatMap(({ label, href, note }) =>
        entry(label, absolute(resolveHref(href as ResolvableLink | null, brand)), note),
      ),
    ],
  ]

  if (isEditorialBrandKey(brand)) {
    sections.push([
      'Latest articles',
      (data.posts ?? []).flatMap((post) => entry(post.title, absolute(postPath(post.slug)))),
    ])
  } else {
    const records = (rows: { _type: string; title: string | null; slug: string | null }[] | null) =>
      (rows ?? []).flatMap((row) => entry(row.title, absolute(sharedRecordHref(row._type, row.slug, brand))))

    sections.push(
      ['Awards open for entries', records(data.awards)],
      ['Upcoming events', records(data.events)],
      ['Latest research', records(data.research)],
    )
  }

  sections.push(['Optional', [`- [Sitemap](${origin}/sitemap.xml)`]])

  const lines = [`# ${seo.siteName}`, '', ...(seo.description ? [`> ${seo.description}`, ''] : [])]

  for (const [heading, links] of sections) {
    if (links.length > 0) {
      lines.push(`## ${heading}`, '', ...new Set(links), '')
    }
  }

  return new Response(`${lines.join('\n').trimEnd()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}

const postPath = (slug: string | null): string | null => (slug ? `/posts/${encodeURIComponent(slug)}` : null)

/** A Markdown list link, `- [label](url): note`, or nothing without a label or URL. */
function entry(label: string | null | undefined, url: string | null, note?: string | null): string[] {
  const text = plainText(label).replace(/[[\]]/g, '')
  const extra = plainText(note)

  return text && url ? [`- [${text}](${url.replace(/[()\s]/g, encodeURIComponent)})${extra ? `: ${extra}` : ''}`] : []
}
