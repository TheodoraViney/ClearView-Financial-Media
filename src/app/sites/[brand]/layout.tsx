import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { VisualEditing } from 'next-sanity/visual-editing'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import { BRAND_KEYS, BRANDS, brandColorVars, isBrandKey, type BrandKey } from '@/brands'
import { Footer } from '@/components/blocks/Footer'
import { Header } from '@/components/blocks/Header'
import { fetchBrandTitle, fetchShell } from '@/sanity/brand-title'
import { getDynamicFetchOptions, SanityLive, type DynamicFetchOptions } from '@/sanity/live'

export function generateStaticParams() {
  return BRAND_KEYS.map((brand) => ({ brand }))
}

// The brand title from Brand settings names every page of the brand: the default title, and the suffix of a page that
// sets its own. Published content only, so it shares the layout's published shell cache entry and needs no draft mode.
export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return {}
  }

  const title = stegaClean(await fetchBrandTitle(brand, { perspective: 'published', stega: false }))

  return { title: { default: title, template: `%s | ${title}` } }
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
  const { data } = await fetchShell(brand, { perspective, variant, stega })

  return (
    <BrandShell
      brand={brand}
      header={<Header data={data} brand={brand} />}
      footer={<Footer data={data} brand={brand} />}
    >
      {children}
    </BrandShell>
  )
}

// The draft-mode Suspense fallback renders the shell without header and footer until the shell data arrives.
// The footer follows the page's <main>, which each page renders inside children.
// Brand colours are inlined from src/brands.ts, the one source shared with the newsletter email.
function BrandShell({
  brand,
  header,
  footer,
  children,
}: {
  brand: BrandKey
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      data-brand={brand}
      className="flex min-h-full flex-col"
      style={brandColorVars(BRANDS[brand].colors) as CSSProperties}
    >
      {header}
      {children}
      {footer}
    </div>
  )
}
