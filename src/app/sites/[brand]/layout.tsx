import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import {
  BRAND_KEYS,
  BRANDS,
  brandDocumentId,
  headerDocumentId,
  isBrandKey,
  type BrandKey,
} from '@/brands'
import { Header } from '@/components/blocks/Header'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { HEADER_QUERY } from '@/sanity/queries'

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
    query: HEADER_QUERY,
    params: {
      brand,
      headerId: headerDocumentId(brand),
      brandId: brandDocumentId(brand),
    },
    perspective,
    variant,
    stega,
  })

  return (
    <BrandShell
      brand={brand}
      color={stegaClean(data?.brand?.brandColor) ?? BRANDS[brand].brandColor}
      header={<Header data={data} brand={brand} />}
    >
      {children}
    </BrandShell>
  )
}

// The draft-mode Suspense fallback renders the shell without a header until the header data arrives.
function BrandShell({
  brand,
  color = BRANDS[brand].brandColor,
  header,
  children,
}: {
  brand: BrandKey
  color?: string
  header?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      data-brand={brand}
      className="flex min-h-full flex-col"
      style={{ '--brand-color': color } as CSSProperties}
    >
      {header}
      {children}
    </div>
  )
}
