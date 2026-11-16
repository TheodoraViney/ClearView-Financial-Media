import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { AWARDS_PROGRAMME_PAGE_ID, brandOrigin } from '@/brands'
import { AwardsProgrammePage } from '@/components/sections/awards/AwardsProgrammePage'
import { isSvg } from '@/components/ui/Media'
import { sharedRecordHref } from '@/lib/links'
import { editionDescription, toAwardsProgrammeView } from '@/sanity/awards-programme-view'
import { fetchAdUnits } from '@/sanity/brand-title'
import { toImage } from '@/sanity/image'
import { cachedSanity, cachedUkToday, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { AWARDS_PROGRAMME_PAGE_QUERY, AWARDS_PROGRAMME_QUERY, OTHER_AWARDS_QUERY } from '@/sanity/queries'
import { PLACEHOLDER_SLUG } from '@/sanity/static-params'

// An awards edition or a conference event at /events/{slug} (sharedRecordHref), the WordPress path without its
// trailing slash. Served on ClearView only, like the other shared records; every other host answers 404. An unknown
// slug is a 404 too. The 404 is intended, so the route opts out of instant-navigation validation, as the award
// category page does.
export const instant = false

type Params = { brand: string; slug: string }

// Nothing is prerendered at build: each edition renders on its first visit and its queries stay cached by
// cachedSanity. Cache Components rejects an empty list, hence one throwaway slug that the page 404s.
export function generateStaticParams() {
  return [{ slug: PLACEHOLDER_SLUG }]
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

function fetchRecord(slug: string, options: DynamicFetchOptions) {
  return cachedSanity({ query: AWARDS_PROGRAMME_QUERY, params: { slug }, ...options })
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand, slug } = await params

  if (brand !== 'clearview') {
    return {}
  }

  const { data } = await fetchRecord(slug, PUBLISHED)

  if (data?._type !== 'awardsProgramme') {
    return {}
  }

  const description = editionDescription(data)
  const logo = toImage(data.logo)
  const path = sharedRecordHref('awardsProgramme', data.slug, 'clearview')
  const canonical = path ? `${brandOrigin('clearview')}${path}` : undefined

  return {
    title: stegaClean(data.title),
    ...(description ? { description } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    // Most edition logos are SVG, which link previews do not show: the Sanity CDN renders those as PNG.
    ...(logo
      ? {
          openGraph: {
            url: canonical,
            images: [{ url: isSvg(logo.src) ? `${logo.src}?fm=png` : logo.src, width: logo.width, height: logo.height, alt: logo.alt }],
          },
        }
      : {}),
  }
}

export default async function EventRoute({ params }: { params: Promise<Params> }) {
  const { brand, slug } = await params

  if (brand !== 'clearview' || slug === PLACEHOLDER_SLUG) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicEvent slug={slug} />
      </Suspense>
    )
  }

  return <CachedEvent slug={slug} perspective="published" stega={false} />
}

async function DynamicEvent({ slug }: { slug: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedEvent slug={slug} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedEvent({ slug, perspective, variant, stega }: { slug: string } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const { data } = await fetchRecord(slug, options)

  // A conference event 404s until the event page is built; it shares the path and the query.
  if (data?._type !== 'awardsProgramme') {
    notFound()
  }

  const today = await cachedUkToday()
  // The sidebar lists upcoming editions of other programmes, so it leaves out editions of this edition's programme.
  // An edition without a programme passes '', which leaves out the other editions that have no programme either.
  const programme = stegaClean(data.programme?.slug) ?? ''
  const [{ data: others }, { data: copy }, ads] = await Promise.all([
    cachedSanity({ query: OTHER_AWARDS_QUERY, params: { programme, today }, ...options }),
    cachedSanity({ query: AWARDS_PROGRAMME_PAGE_QUERY, params: { id: AWARDS_PROGRAMME_PAGE_ID }, ...options }),
    fetchAdUnits('clearview', 'other', options),
  ])

  // The labels document is required, like the award category page's: no copy defaults in code.
  if (!copy) {
    notFound()
  }

  const embedConsent = { text: copy.videoConsentText ?? '', button: copy.videoConsentButton ?? '' }

  return <AwardsProgrammePage view={toAwardsProgrammeView({ edition: data, others, copy, ads, today, embedConsent })} />
}
