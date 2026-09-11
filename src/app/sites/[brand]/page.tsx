import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BRANDS, isBrandKey, type BrandKey } from '@/brands'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { HOME_PAGE_QUERY } from '@/sanity/queries'

export default async function BrandHomePage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicHome brand={brand} />
      </Suspense>
    )
  }

  return <CachedHome brand={brand} perspective="published" stega={false} />
}

async function DynamicHome({ brand }: { brand: BrandKey }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return (
    <CachedHome
      brand={brand}
      perspective={perspective}
      variant={variant}
      stega={stega}
    />
  )
}

async function CachedHome({
  brand,
  perspective,
  variant,
  stega,
}: { brand: BrandKey } & DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: HOME_PAGE_QUERY,
    params: { brand },
    perspective,
    variant,
    stega,
  })

  if (!data) {
    return (
      <main className="px-6 py-16">
        <h1 className="text-3xl font-semibold">{BRANDS[brand].title}</h1>
        <p>No home page published yet.</p>
      </main>
    )
  }

  return (
    <main>
      <BlockRenderer blocks={data.blocks} />
    </main>
  )
}
