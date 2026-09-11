import Image from 'next/image'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { isBrandKey, type BrandKey } from '@/brands'
import { PortableText } from '@/components/PortableText'
import { urlFor } from '@/sanity/image'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { POST_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'
import { PLACEHOLDER_SLUG, withPlaceholder } from '@/sanity/static-params'

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

  return (
    <main className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold">{data.title}</h1>
      {data.publishedAt && (
        <time dateTime={data.publishedAt}>
          {new Date(data.publishedAt).toISOString().slice(0, 10)}
        </time>
      )}
      {data.image?.asset && (
        <Image
          src={urlFor(data.image).width(1600).fit('max').url()}
          alt={data.title ?? ''}
          width={800}
          height={450}
          className="h-auto w-full"
          priority
        />
      )}
      {data.content && <PortableText value={data.content} />}
    </main>
  )
}
