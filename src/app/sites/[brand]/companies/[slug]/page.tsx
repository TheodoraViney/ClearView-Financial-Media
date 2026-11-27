import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PARTNER_PROFILE_PAGE_ID } from '@/brands'
import { PartnerProfilePage } from '@/components/sections/partner-profile/PartnerProfilePage'
import { fetchAdUnits } from '@/sanity/brand-title'
import { cachedSanity, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import {
  partnerProfileDescription,
  partnerProfilePath,
  toPartnerProfileView,
} from '@/sanity/partner-profile-view'
import { PARTNER_PROFILE_PAGE_QUERY, PARTNER_PROFILE_QUERY } from '@/sanity/queries'
import { pageMetadata } from '@/sanity/seo'
import { PLACEHOLDER_SLUG } from '@/sanity/static-params'

// A partner profile at /companies/{slug} (sharedRecordHref), for a company that an awards edition, an event or a post
// names (COMPANY_HAS_PROFILE); any other company, an unknown slug and every host but ClearView answer 404. The 404 is
// intended, so the route opts out of instant-navigation validation, as the event and research report pages do.
export const instant = false

type Params = { brand: string; slug: string }

// Nothing is prerendered at build: each profile renders on its first visit and its queries stay cached by
// cachedSanity. Cache Components rejects an empty list, hence one throwaway slug that the page 404s.
export function generateStaticParams() {
  return [{ slug: PLACEHOLDER_SLUG }]
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

// The segment arrives percent-encoded when the slug holds characters outside ASCII. Sanity holds the decoded slug.
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

function fetchCompany(slug: string, options: DynamicFetchOptions) {
  return cachedSanity({ query: PARTNER_PROFILE_QUERY, params: { slug }, ...options })
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand } = await params
  const slug = decodeSlug((await params).slug)

  if (brand !== 'clearview') {
    return {}
  }

  const { data } = await fetchCompany(slug, PUBLISHED)

  if (!data) {
    return {}
  }

  // Most company logos are SVG, which link previews do not show: those fall through to the brand image.
  return pageMetadata({
    brand,
    path: partnerProfilePath(data),
    seo: data.seo,
    title: data.title,
    description: partnerProfileDescription(data),
    images: [data.profileImage, data.logo],
  })
}

export default async function PartnerProfileRoute({ params }: { params: Promise<Params> }) {
  const { brand } = await params
  const slug = decodeSlug((await params).slug)

  if (brand !== 'clearview' || slug === PLACEHOLDER_SLUG) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicProfile slug={slug} />
      </Suspense>
    )
  }

  return <CachedProfile slug={slug} perspective="published" stega={false} />
}

async function DynamicProfile({ slug }: { slug: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedProfile slug={slug} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedProfile({ slug, perspective, variant, stega }: { slug: string } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const [{ data: company }, { data: copy }, ads] = await Promise.all([
    fetchCompany(slug, options),
    cachedSanity({ query: PARTNER_PROFILE_PAGE_QUERY, params: { id: PARTNER_PROFILE_PAGE_ID }, ...options }),
    fetchAdUnits('clearview', 'other', options),
  ])

  // The labels document is required, like the research report page's: no copy defaults in code.
  if (!company || !copy) {
    notFound()
  }

  return <PartnerProfilePage view={toPartnerProfileView({ company, copy, ads })} />
}
