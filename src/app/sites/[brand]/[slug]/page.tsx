import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { isBrandKey, type BrandKey } from '@/brands'
import { PageBlocks } from '@/components/blocks/PageBlocks'
import { COMPANY_ENGAGEMENT_PAGE_SLUG } from '@/lib/company-engagement'
import { SHARED_LISTINGS_PAGE_SLUG } from '@/lib/shared-listings'
import { fetchAdUnits } from '@/sanity/brand-title'
import {
  cachedNow,
  cachedSanity,
  cachedUkToday,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { PAGE_QUERY, PAGE_SLUGS_QUERY } from '@/sanity/queries'
import { pageMetadata, SEO_FETCH } from '@/sanity/seo'
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

const isServedSlug = (slug: string) =>
  slug !== PLACEHOLDER_SLUG && slug !== SHARED_LISTINGS_PAGE_SLUG && slug !== COMPANY_ENGAGEMENT_PAGE_SLUG

export async function generateMetadata({ params }: { params: Promise<{ brand: string; slug: string }> }): Promise<Metadata> {
  const { brand, slug } = await params

  if (!isBrandKey(brand) || !isServedSlug(slug)) {
    return {}
  }

  const { data } = await cachedSanity({
    query: PAGE_QUERY,
    params: { brand, slug, today: await cachedUkToday() },
    ...SEO_FETCH,
  })

  if (!data) {
    return {}
  }

  return pageMetadata({
    brand,
    path: `/${encodeURIComponent(slug)}`,
    seo: data.seo,
    title: data.title,
    description: data.heroText,
    images: [data.heroImage],
  })
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string; slug: string }>
}) {
  const { brand, slug } = await params

  // The shared listings page is served only at its listing paths (/events-category/…, /resource-categories/research),
  // the Company Engagement page only at /companies.
  if (!isBrandKey(brand) || !isServedSlug(slug)) {
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
  const [today, now, ads] = await Promise.all([
    cachedUkToday(),
    cachedNow(),
    fetchAdUnits(brand, 'other', { perspective, variant, stega }),
  ])
  const { data } = await cachedSanity({
    query: PAGE_QUERY,
    params: { brand, slug, today },
    perspective,
    variant,
    stega,
  })

  if (!data) {
    notFound()
  }

  // A page that opens with a Hero with image, a Hero over image, a Contact form or Legal text has its H1 there, so the
  // template's title would be a second H1.
  const first = data.blocks?.[0]?._type
  const ownsHeading =
    first === 'imageHero' || first === 'overlayHero' || first === 'contactForm' || first === 'legalText'

  return (
    <main>
      <PageBlocks
        blocks={data.blocks}
        brand={brand}
        today={today}
        now={now}
        ads={ads}
        options={{ perspective, variant, stega }}
        intro={ownsHeading ? undefined : <h1 className="px-6 pt-10 text-3xl font-semibold">{data.title}</h1>}
      />
    </main>
  )
}
