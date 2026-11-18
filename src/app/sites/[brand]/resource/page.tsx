import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RESEARCH_PREFIX_LISTING_PATH } from '@/lib/links'
import type { RawSearchParams } from '@/lib/shared-listings'
import { SharedListingsRoute, sharedListingsMetadata } from '@/sanity/shared-listings-route'

// Bare /resource (RESEARCH_PREFIX_LISTING_PATH), a legacy clearviewpublishing.com URL: the shared listings page's
// Research tab under its own path, its canonical at /resource-categories/research (sharedListingsMetadata), as
// /events-category/briefings shows the Events tab with its canonical at summits. ClearView only; every other host is a
// 404. The reports themselves are /resource/{slug} ([slug]/page.tsx). A blocking route, like the other listing paths.
export const instant = false

type Props = {
  params: Promise<{ brand: string }>
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params

  if (brand !== 'clearview') {
    return {}
  }

  return sharedListingsMetadata({ tab: 'research', path: RESEARCH_PREFIX_LISTING_PATH, searchParams: await searchParams })
}

export default async function ResourceListingRoute({ params, searchParams }: Props) {
  const { brand } = await params

  if (brand !== 'clearview') {
    notFound()
  }

  return <SharedListingsRoute tab="research" path={RESEARCH_PREFIX_LISTING_PATH} searchParams={await searchParams} />
}
