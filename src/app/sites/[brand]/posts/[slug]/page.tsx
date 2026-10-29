import { draftMode } from 'next/headers'
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
import { PEOPLE_MOVES_CATEGORY_ID } from '@/lib/article-taxonomy'
import { fromPost } from '@/sanity/article-view'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { ARTICLE_PAGE_QUERY, MOST_READ_QUERY, POST_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'
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
}: { brand: EditorialBrandKey; slug: string } & DynamicFetchOptions) {
  const [{ data: post }, { data: mostRead }, { data: copy }] = await Promise.all([
    cachedSanity({
      query: POST_QUERY,
      params: { brand, slug, peopleMoves: PEOPLE_MOVES_CATEGORY_ID },
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
    cachedSanity({
      query: ARTICLE_PAGE_QUERY,
      params: { id: articlePageDocumentId(brand) },
      perspective,
      variant,
      stega,
    }),
  ])

  if (!post) {
    notFound()
  }

  const article = fromPost({
    post,
    mostRead,
    copy,
    brand,
    body: post.content ? <ArticleBody value={post.content} /> : null,
  })

  return <ArticlePage article={article} />
}
