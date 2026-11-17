import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RESEARCH_LISTING_PATH } from '@/lib/links'
import { RESOURCE_CATEGORIES, type RawSearchParams } from '@/lib/shared-listings'
import { SharedListingsRoute, sharedListingsMetadata } from '@/sanity/shared-listings-route'

// The shared listings page's Research tab at the legacy clearviewpublishing.com path /resource-categories/research
// (RESEARCH_LISTING_PATH). Research is the only category; any other is a 404, as is every host but ClearView.
// A blocking route, like /events-category/{category}, for the same reasons.
export const instant = false

type Props = {
  params: Promise<{ brand: string; category: string }>
  searchParams: Promise<RawSearchParams>
}

export function generateStaticParams() {
  return RESOURCE_CATEGORIES.map((category) => ({ category }))
}

const isResearch = (brand: string, category: string) => brand === 'clearview' && category === 'research'

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand, category } = await params

  if (!isResearch(brand, category)) {
    return {}
  }

  return sharedListingsMetadata({ tab: 'research', path: RESEARCH_LISTING_PATH, searchParams: await searchParams })
}

export default async function ResourceCategoryRoute({ params, searchParams }: Props) {
  const { brand, category } = await params

  if (!isResearch(brand, category)) {
    notFound()
  }

  return <SharedListingsRoute tab="research" path={RESEARCH_LISTING_PATH} searchParams={await searchParams} />
}
