import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AWARDS_PROGRAMME_PAGE_ID, EVENT_PAGE_ID } from '@/brands'
import { AwardsProgrammePage } from '@/components/sections/awards/AwardsProgrammePage'
import { EventPage } from '@/components/sections/events/EventPage'
import { CurrentNavSection } from '@/components/sections/header/nav-section.client'
import { sharedRecordHref } from '@/lib/links'
import { editionDescription, toAwardsProgrammeView } from '@/sanity/awards-programme-view'
import { fetchAdUnits } from '@/sanity/brand-title'
import { eventDescription, toEventPageView, type ConferenceEventData } from '@/sanity/event-page-view'
import { cachedSanity, cachedUkToday, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import {
  AWARDS_PROGRAMME_PAGE_QUERY,
  AWARDS_PROGRAMME_QUERY,
  EVENT_PAGE_QUERY,
  OPEN_AWARDS_QUERY,
  RELATED_EVENTS_QUERY,
} from '@/sanity/queries'
import { pageMetadata } from '@/sanity/seo'
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

// The segment arrives percent-encoded when the slug holds characters outside ASCII: two WordPress event slugs carry
// zero-width spaces, and their legacy URLs (in the redirect baseline) keep them. Sanity holds the decoded slug.
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

function fetchRecord(slug: string, options: DynamicFetchOptions) {
  return cachedSanity({ query: AWARDS_PROGRAMME_QUERY, params: { slug }, ...options })
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand } = await params
  const slug = decodeSlug((await params).slug)

  if (brand !== 'clearview') {
    return {}
  }

  const { data } = await fetchRecord(slug, PUBLISHED)

  if (data?._type !== 'awardsProgramme' && data?._type !== 'conferenceEvent') {
    return {}
  }

  // Most edition and event logos are SVG, which link previews do not show: those fall through to the brand image.
  return pageMetadata({
    brand,
    path: sharedRecordHref(data._type, data.slug, 'clearview'),
    seo: data.seo,
    title: data.title,
    description: data._type === 'awardsProgramme' ? editionDescription(data) : eventDescription(data),
    images: data._type === 'awardsProgramme' ? [data.logo, data.highlightVideoThumbnail] : [data.logo],
  })
}

export default async function EventRoute({ params }: { params: Promise<Params> }) {
  const { brand } = await params
  const slug = decodeSlug((await params).slug)

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

  if (data?._type === 'conferenceEvent') {
    return <ConferenceEvent event={data} options={options} />
  }

  if (data?._type !== 'awardsProgramme') {
    notFound()
  }

  const today = await cachedUkToday()
  // "Open awards programmes": editions of every programme whose nominations are open, without this edition.
  const [{ data: open }, { data: copy }, ads] = await Promise.all([
    cachedSanity({ query: OPEN_AWARDS_QUERY, params: { editionId: data._id, today }, ...options }),
    cachedSanity({ query: AWARDS_PROGRAMME_PAGE_QUERY, params: { id: AWARDS_PROGRAMME_PAGE_ID }, ...options }),
    fetchAdUnits('clearview', 'other', options),
  ])

  // The labels document is required, like the award category page's: no copy defaults in code.
  if (!copy) {
    notFound()
  }

  const embedConsent = { text: copy.videoConsentText ?? '', button: copy.videoConsentButton ?? '' }

  return (
    <>
      <CurrentNavSection section="awards" />
      <AwardsProgrammePage view={toAwardsProgrammeView({ edition: data, open, copy, ads, today, embedConsent })} />
    </>
  )
}

async function ConferenceEvent({ event, options }: { event: ConferenceEventData; options: DynamicFetchOptions }) {
  const today = await cachedUkToday()
  const [{ data: others }, { data: copy }, ads] = await Promise.all([
    cachedSanity({ query: RELATED_EVENTS_QUERY, params: { eventId: event._id, today }, ...options }),
    cachedSanity({ query: EVENT_PAGE_QUERY, params: { id: EVENT_PAGE_ID }, ...options }),
    fetchAdUnits('clearview', 'other', options),
  ])

  // The labels document is required, like the awards programme page's: no copy defaults in code.
  if (!copy) {
    notFound()
  }

  return (
    <>
      <CurrentNavSection section="events" />
      <EventPage view={toEventPageView({ event, others, copy, ads, today })} />
    </>
  )
}
