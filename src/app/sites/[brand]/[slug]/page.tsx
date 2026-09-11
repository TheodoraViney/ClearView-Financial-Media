import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { isBrandKey, type BrandKey } from '@/brands'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { PAGE_QUERY, PAGE_SLUGS_QUERY } from '@/sanity/queries'
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
    query: PAGE_SLUGS_QUERY,
    params: { brand },
    perspective: 'published',
    stega: false,
  })

  return withPlaceholder(
    (data ?? []).flatMap(({ slug }) => (slug ? [{ slug }] : [])),
  )
}

export default async function BrandPage({
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
        <DynamicPage brand={brand} slug={slug} />
      </Suspense>
    )
  }

  return (
    <CachedPage
      brand={brand}
      slug={slug}
      perspective="published"
      stega={false}
    />
  )
}

async function DynamicPage({ brand, slug }: { brand: BrandKey; slug: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return (
    <CachedPage
      brand={brand}
      slug={slug}
      perspective={perspective}
      variant={variant}
      stega={stega}
    />
  )
}

async function CachedPage({
  brand,
  slug,
  perspective,
  variant,
  stega,
}: { brand: BrandKey; slug: string } & DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: PAGE_QUERY,
    params: { brand, slug },
    perspective,
    variant,
    stega,
  })

  if (!data) {
    notFound()
  }

  return (
    <main>
      <h1 className="px-6 pt-10 text-3xl font-semibold">{data.title}</h1>
      <BlockRenderer blocks={data.blocks} />
    </main>
  )
}
