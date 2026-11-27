import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { isBrandKey, type BrandKey } from '@/brands'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import { PageAd } from '@/components/blocks/PageAd'
import { PageBlocks } from '@/components/blocks/PageBlocks'
import { fetchAdUnits, fetchBrandTitle } from '@/sanity/brand-title'
import {
  cachedNow,
  cachedSanity,
  cachedUkToday,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { HOME_PAGE_QUERY } from '@/sanity/queries'
import { pageMetadata, SEO_FETCH } from '@/sanity/seo'

// The home page leads its title with the brand ("{name in titles} | {meta title}"), else shows the brand title alone.
export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return {}
  }

  const { data } = await cachedSanity({
    query: HOME_PAGE_QUERY,
    params: { brand, today: await cachedUkToday() },
    ...SEO_FETCH,
  })

  return pageMetadata({ brand, path: '/', seo: data?.seo, home: true })
}

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
  const [today, now, ads] = await Promise.all([
    cachedUkToday(),
    cachedNow(),
    fetchAdUnits(brand, 'home', { perspective, variant, stega }),
  ])
  const { data } = await cachedSanity({
    query: HOME_PAGE_QUERY,
    params: { brand, today },
    perspective,
    variant,
    stega,
  })

  if (!data) {
    // Same shell query and options as the layout, so the title comes from its cache entry, stega included.
    const title = await fetchBrandTitle(brand, { perspective, variant, stega })

    return (
      <main className="px-6 py-16">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p>No home page published yet.</p>
      </main>
    )
  }

  // The home template's banners: Top and Side with the first blocks, then Banner 3 and Banner 4 between the three
  // block lists. Banner 4 follows the middle list, so it goes with it when that list is empty.
  const hasMiddle = Boolean(data.blocksMiddle?.length)
  const options = { perspective, variant, stega }

  return (
    <main>
      <PageBlocks blocks={data.blocks} brand={brand} today={today} now={now} ads={ads} options={options} />
      <PageAd position="banner3" ads={ads} brand={brand} />
      <BlockRenderer blocks={data.blocksMiddle} brand={brand} today={today} now={now} ads={ads} options={options} />
      {hasMiddle && <PageAd position="banner4" ads={ads} brand={brand} />}
      <BlockRenderer blocks={data.blocksBottom} brand={brand} today={today} now={now} ads={ads} options={options} />
    </main>
  )
}
