import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { isBrandKey, type BrandKey } from '@/brands'
import { PortableText } from '@/components/PortableText'
import { Media, type MediaSlot } from '@/components/ui/Media'
import { toImage } from '@/sanity/image'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { POST_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'
import { PLACEHOLDER_SLUG, withPlaceholder } from '@/sanity/static-params'

// Prototype layout: `main` is the full viewport minus `px-6` on both sides.
const COLUMN: MediaSlot = { base: { w: '100vw - 48px' } }

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

  if (!isBrandKey(brand) || slug === PLACEHOLDER_SLUG) {
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

async function DynamicPost({ brand, slug }: { brand: BrandKey; slug: string }) {
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
}: { brand: BrandKey; slug: string } & DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: POST_QUERY,
    params: { brand, slug },
    perspective,
    variant,
    stega,
  })

  if (!data) {
    notFound()
  }

  const image = toImage(data.image)

  return (
    <main className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold">{data.title}</h1>
      {data.publishedAt && (
        <time dateTime={data.publishedAt}>
          {new Date(data.publishedAt).toISOString().slice(0, 10)}
        </time>
      )}
      {image && <Media image={{ ...image, alt: data.title ?? '' }} slot={COLUMN} natural priority />}
      {data.content && <PortableText value={data.content} imageSlot={COLUMN} />}
    </main>
  )
}
