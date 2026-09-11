import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { type SanityImageSource } from '@sanity/image-url'
import { stegaClean } from 'next-sanity'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import { BRAND_KEYS, BRANDS, brandDocumentId, isBrandKey, type BrandKey } from '@/brands'
import { BrandHeader } from '@/components/BrandHeader'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { BRAND_QUERY } from '@/sanity/queries'

export function generateStaticParams() {
  return BRAND_KEYS.map((brand) => ({ brand }))
}

export default async function BrandLayout({
  params,
  children,
}: {
  params: Promise<{ brand: string }>
  children: ReactNode
}) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={<BrandShell brand={brand}>{children}</BrandShell>}>
        <DynamicBrandShell brand={brand}>{children}</DynamicBrandShell>
      </Suspense>
    )
  }

  return (
    <CachedBrandShell brand={brand} perspective="published" stega={false}>
      {children}
    </CachedBrandShell>
  )
}

async function DynamicBrandShell({
  brand,
  children,
}: {
  brand: BrandKey
  children: ReactNode
}) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return (
    <CachedBrandShell
      brand={brand}
      perspective={perspective}
      variant={variant}
      stega={stega}
    >
      {children}
    </CachedBrandShell>
  )
}

async function CachedBrandShell({
  brand,
  children,
  perspective,
  variant,
  stega,
}: { brand: BrandKey; children: ReactNode } & DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: BRAND_QUERY,
    params: { brandId: brandDocumentId(brand) },
    perspective,
    variant,
    stega,
  })

  return (
    <BrandShell
      brand={brand}
      title={data?.title ?? BRANDS[brand].title}
      color={stegaClean(data?.brandColor) ?? BRANDS[brand].brandColor}
      logo={data?.logo}
    >
      {children}
    </BrandShell>
  )
}

function BrandShell({
  brand,
  title = BRANDS[brand].title,
  color = BRANDS[brand].brandColor,
  logo,
  children,
}: {
  brand: BrandKey
  title?: string
  color?: string
  logo?: SanityImageSource | null
  children: ReactNode
}) {
  return (
    <div
      data-brand={brand}
      className="flex min-h-full flex-col"
      style={{ '--brand-color': color } as CSSProperties}
    >
      <BrandHeader title={title} logo={logo} />
      {children}
    </div>
  )
}
