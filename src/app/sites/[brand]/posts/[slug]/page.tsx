import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { stegaClean } from 'next-sanity'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import {
  articlePageDocumentId,
  isBrandKey,
  isEditorialBrandKey,
  mostReadDocumentId,
  type EditorialBrandKey,
} from '@/brands'
import { ArticleBody } from '@/components/sections/article/ArticleBody'
import { ArticlePage } from '@/components/sections/article/ArticlePage'
import { ArticleViewEvent } from '@/components/ui/AnalyticsEvents.client'
import { JsonLd } from '@/components/ui/JsonLd'
import { jsonLdGraph } from '@/lib/json-ld'
import { fromPost, toEmbedConsentCopy } from '@/sanity/article-view'
import { fetchAdUnits } from '@/sanity/brand-title'
import { breadcrumbList, newsArticle } from '@/sanity/json-ld'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { mostReadAutoFill } from '@/sanity/most-read'
import { ARTICLE_PAGE_QUERY, MOST_READ_QUERY, POST_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'
import { canonicalUrl, pageMetadata, recordShareImage, SEO_FETCH } from '@/sanity/seo'
import { PLACEHOLDER_SLUG, withPlaceholder } from '@/sanity/static-params'

// A slug of another brand, or of no post, ends in notFound() inside the page. Instant-navigation validation (dev
// only) then reports the page segment as "prevented from rendering". The 404 is intended, so the route opts out of
// that validation. Build-time prerendering of the generateStaticParams slugs is unaffected: `instant` only sets
// validation, and the archive route's `false` has a different reason (it renders per request on purpose).
export const instant = false

export async function generateStaticParams({
  params,
}: {
  params: { brand: string }
}) {
  const { brand } = params

  if (!isBrandKey(brand)) {
    return withPlaceholder([])
  }

  const { data } = await cachedSanity({
    query: POST_SLUGS_QUERY,
    params: { brand },
    perspective: 'published',
    stega: false,
  })

  return withPlaceholder(
    (data ?? []).flatMap(({ slug }) => (slug ? [{ slug }] : [])),
  )
}

// A post on several brands renders on each of their hosts; its canonical is on its first brand.
export async function generateMetadata({ params }: { params: Promise<{ brand: string; slug: string }> }): Promise<Metadata> {
  const { brand, slug } = await params

  if (!isEditorialBrandKey(brand) || slug === PLACEHOLDER_SLUG) {
    return {}
  }

  const { data: post } = await cachedSanity({ query: POST_QUERY, params: { brand, slug }, ...SEO_FETCH })

  if (!post?.slug) {
    return {}
  }

  return pageMetadata({
    brand,
    canonicalBrand: canonicalBrand(post.brands, brand),
    path: postPath(post.slug),
    seo: post.seo,
    title: post.title,
    description: post.excerpt,
    images: [post.image],
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post._updatedAt,
      section: post.category?.title,
      authors: [post.author?.name],
    },
  })
}

/** A post's canonical brand: its first brand, else the host's. */
function canonicalBrand(brands: string[] | null | undefined, brand: EditorialBrandKey): EditorialBrandKey {
  const first = stegaClean(brands?.[0])

  return first && isEditorialBrandKey(first) ? first : brand
}

const postPath = (slug: string) => `/posts/${encodeURIComponent(stegaClean(slug))}`

export default async function PostPage({
  params,
}: {
  params: Promise<{ brand: string; slug: string }>
}) {
  const { brand, slug } = await params

  // Posts belong to the editorial brands only; ClearView has none.
  if (!isEditorialBrandKey(brand) || slug === PLACEHOLDER_SLUG) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicPost brand={brand} slug={slug} />
      </Suspense>
    )
  }

  return (
    <CachedPost
      brand={brand}
      slug={slug}
      perspective="published"
      stega={false}
      live
    />
  )
}

async function DynamicPost({ brand, slug }: { brand: EditorialBrandKey; slug: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return (
    <CachedPost
      brand={brand}
      slug={slug}
      perspective={perspective}
      variant={variant}
      stega={stega}
    />
  )
}

async function CachedPost({
  brand,
  slug,
  perspective,
  variant,
  stega,
  live = false,
}: { brand: EditorialBrandKey; slug: string; live?: boolean } & DynamicFetchOptions) {
  const [{ data: post }, { data: mostRead }, mostReadFill, { data: copy }, ads] = await Promise.all([
    cachedSanity({
      query: POST_QUERY,
      params: { brand, slug },
      perspective,
      variant,
      stega,
    }),
    cachedSanity({
      query: MOST_READ_QUERY,
      params: { brand, id: mostReadDocumentId(brand) },
      perspective,
      variant,
      stega,
    }),
    mostReadAutoFill({ brand, slug, perspective, variant, stega }),
    cachedSanity({
      query: ARTICLE_PAGE_QUERY,
      params: { id: articlePageDocumentId(brand) },
      perspective,
      variant,
      stega,
    }),
    fetchAdUnits(brand, 'other', { perspective, variant, stega }),
  ])

  if (!post) {
    notFound()
  }

  const article = fromPost({
    post,
    mostRead,
    mostReadFill,
    copy,
    ads,
    brand,
    body: (
      <ArticleBody
        value={post.content}
        after={post.contentAfter}
        banner={ads.article}
        embedCopy={toEmbedConsentCopy(copy)}
      />
    ),
  })

  // The article as structured data: NewsArticle published by its canonical brand, and the visible trail (Home, the
  // category) ending at the article on this host.
  const publisher = canonicalBrand(post.brands, brand)
  const url = post.slug ? canonicalUrl({ brand: publisher, path: postPath(post.slug), seo: post.seo }) : null
  const jsonLd = url
    ? jsonLdGraph([
        await newsArticle({
          url,
          publisher,
          title: post.title,
          seoDescription: post.seo?.description,
          excerpt: post.excerpt,
          image: recordShareImage(post.seo, [post.image]),
          publishedAt: post.publishedAt,
          updatedAt: post._updatedAt,
          section: post.category?.title,
          author: post.author ? { name: post.author.name, jobTitle: post.author.jobTitle, photo: post.author.photo } : null,
        }),
        breadcrumbList(
          brand,
          [{ label: article.copy.breadcrumbHomeLabel, href: '/' }, ...(article.category ? [article.category] : []), { label: post.title }],
          article.shareUrl,
        ),
      ])
    : null

  // `article_view` on the live site only: a preview is not a read.
  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticlePage article={article} />
      {live && <ArticleViewEvent source="cms" id={post._id} />}
    </>
  )
}
