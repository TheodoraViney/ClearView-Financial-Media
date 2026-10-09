import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { VisualEditing } from 'next-sanity/visual-editing'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import {
  BRAND_KEYS,
  BRANDS,
  brandDocumentId,
  footerDocumentId,
  headerDocumentId,
  isBrandKey,
  type BrandKey,
} from '@/brands'
import { Footer } from '@/components/blocks/Footer'
import { Header } from '@/components/blocks/Header'
import {
  cachedSanity,
  getDynamicFetchOptions,
  SanityLive,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { SHELL_QUERY } from '@/sanity/queries'

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

  // Live and Visual Editing belong to the site only. In the root layout they also ran inside /studio,
  // which shares the draft-mode cookie, so every live event refreshed the Studio window as well.
  if (isDraftMode) {
    return (
      <>
        <Suspense fallback={<BrandShell brand={brand}>{children}</BrandShell>}>
          <DynamicBrandShell brand={brand}>{children}</DynamicBrandShell>
        </Suspense>
        <SanityLive includeDrafts />
        <VisualEditing />
      </>
    )
  }

  return (
    <>
      <CachedBrandShell brand={brand} perspective="published" stega={false}>
        {children}
      </CachedBrandShell>
      <SanityLive includeDrafts={false} />
    </>
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
    query: SHELL_QUERY,
    params: {
      brand,
      headerId: headerDocumentId(brand),
      footerId: footerDocumentId(brand),
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
      footer={<Footer data={data} brand={brand} />}
    >
      {children}
    </BrandShell>
  )
}

// The draft-mode Suspense fallback renders the shell without header and footer until the shell data arrives.
// The footer follows the page's <main>, which each page renders inside children.
function BrandShell({
  brand,
  color = BRANDS[brand].brandColor,
  header,
  footer,
  children,
}: {
  brand: BrandKey
  color?: string
  header?: ReactNode
  footer?: ReactNode
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
      {footer}
    </div>
  )
}
