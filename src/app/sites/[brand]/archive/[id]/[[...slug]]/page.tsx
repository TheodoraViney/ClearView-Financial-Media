import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { connection } from 'next/server'

import { stegaClean } from 'next-sanity'

import { articlePageDocumentId, brandOrigin, isEditorialBrandKey, mostReadDocumentId, type EditorialBrandKey } from '@/brands'
import { toLogo } from '@/components/blocks/shell'
import { ArchiveBody } from '@/components/sections/article/ArchiveBody'
import { ArticlePage } from '@/components/sections/article/ArticlePage'
import {
  archiveArticlePath,
  archiveCanonicalUrl,
  archivePlainText,
  getArchiveRecord,
  parseArchiveId,
  type ArchiveRecord,
} from '@/lib/archive'
import { fromArchiveRecord } from '@/sanity/article-view'
import { brandTitle, fetchBrandTitle, fetchShell } from '@/sanity/brand-title'
import { cachedSanity, type DynamicFetchOptions } from '@/sanity/live'
import { mostReadAutoFill } from '@/sanity/most-read'
import { ARTICLE_PAGE_QUERY, MOST_READ_QUERY } from '@/sanity/queries'

// Legacy archive articles on the article template (src/components/sections/article/ArticlePage.tsx).

type Params = Promise<{ brand: string; id: string; slug?: string[] }>

// Rendered per request, so no article page is prerendered or stored. With a stored page per visited URL, a crawl of
// 100k articles on three hosts, or requests for made-up ids, would write an unbounded number of cache entries.
export const instant = false

/**
 * The record behind the URL, or a 404: a host that is not an editorial brand
 * (ClearView carries no archive), an id that is not a legacy id, or an id the
 * archive does not hold. Every editorial host renders every article, as the
 * legacy sites did: each of them served all articles, whatever their
 * publication. The canonical tag names the article's own publication.
 */
async function loadArticle(params: Params): Promise<{ brand: EditorialBrandKey; record: ArchiveRecord; slug?: string[] }> {
  await connection()

  const { brand, id: rawId, slug } = await params

  if (!isEditorialBrandKey(brand)) {
    notFound()
  }

  const id = parseArchiveId(rawId)
  const record = id === null ? null : await getArchiveRecord(id)

  if (!record) {
    notFound()
  }

  return { brand, record, slug }
}

// The brand's shell, Article page copy and Most read come from published Sanity content through cached queries: the
// archive is not CMS content, so it has no draft view. None of these queries takes the article id, so the cache holds
// a few entries per brand, however many archive URLs are crawled.
const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

const DESCRIPTION_LENGTH = 160

/** The standfirst, else the start of the body as plain text, cut at a word near 160 characters. */
function describe(record: ArchiveRecord): string | undefined {
  const text = (record.standfirst ?? archivePlainText(record.bodyHtml)).trim()

  if (!text) {
    return undefined
  }

  if (text.length <= DESCRIPTION_LENGTH) {
    return text
  }

  const cut = text.slice(0, DESCRIPTION_LENGTH)
  const boundary = cut.lastIndexOf(' ')

  return `${(boundary > 80 ? cut.slice(0, boundary) : cut).replace(/[\s,.;:]+$/, '')}…`
}

/** A featured image the page can load: our archive media, or an external image over https. */
function imageSrc(value: string | null | undefined): string | null {
  return value && (value.startsWith('/archive-media/') || value.startsWith('https://')) ? value : null
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { brand, record } = await loadArticle(params)
  const description = describe(record)
  const image = imageSrc(record.media.image)
  const canonical = archiveCanonicalUrl(record, brand)
  const siteName = stegaClean(await fetchBrandTitle(brand, PUBLISHED))

  return {
    title: record.title,
    description,
    // Every editorial domain renders the article; its first publication is canonical.
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: record.title,
      description,
      url: canonical,
      siteName,
      images: image ? [{ url: image.startsWith('/') ? `${brandOrigin(brand)}${image}` : image }] : undefined,
    },
  }
}

export default async function ArchiveArticlePage({ params }: { params: Params }) {
  const { brand, record, slug } = await loadArticle(params)

  // The id identifies the article and the slug is cosmetic: any other slug, or none, goes to the canonical URL.
  if (slug?.length !== 1 || slug[0] !== record.slug) {
    permanentRedirect(archiveArticlePath(record))
  }

  const [{ data: shell }, { data: mostRead }, mostReadFill, { data: copy }] = await Promise.all([
    fetchShell(brand, PUBLISHED),
    cachedSanity({ query: MOST_READ_QUERY, params: { brand, id: mostReadDocumentId(brand) }, ...PUBLISHED }),
    // No post is being read: an empty slug excludes none.
    mostReadAutoFill({ brand, slug: '', ...PUBLISHED }),
    cachedSanity({ query: ARTICLE_PAGE_QUERY, params: { id: articlePageDocumentId(brand) }, ...PUBLISHED }),
  ])

  const article = fromArchiveRecord({
    record,
    mostRead,
    mostReadFill,
    copy,
    brand,
    logo: toLogo(shell.brand?.logo, brandTitle(brand, shell.brand?.title)),
    body: <ArchiveBody html={record.bodyHtml ?? ''} videoId={record.media.videoId} title={record.title} />,
  })

  return <ArticlePage article={article} />
}
