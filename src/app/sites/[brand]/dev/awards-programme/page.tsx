import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AWARDS_PROGRAMME_PAGE_ID } from '@/brands'
import { AwardsProgrammePage } from '@/components/sections/awards/AwardsProgrammePage'
import { toAwardsProgrammeView, type EditionData } from '@/sanity/awards-programme-view'
import { fetchAdUnits } from '@/sanity/brand-title'
import { cachedSanity, cachedUkToday, type DynamicFetchOptions } from '@/sanity/live'
import { AWARDS_PROGRAMME_PAGE_QUERY, AWARDS_PROGRAMME_QUERY, OPEN_AWARDS_QUERY } from '@/sanity/queries'

import fixture from './fixture.json'

// Temporary review page, like /dev/ui (404 when NEXT_PUBLIC_SITE_ENV=production): the awards programme page (design
// v1.11) with a real published edition patched to its shape after the v1.10 data migration, which is not applied
// yet. fixture.json holds the dry-run output of scripts/migrate-awards-v1-10.mjs: the page document's new labels (plus
// the v1.11 "View all awards" link and heading), and for three editions the FAQ, the registration steps and the body
// additions.
// `?edition=event-wp-45458` (default, nominations closed), `event-wp-46721` (open), `event-wp-46584` (open, video);
// `?slug=...` renders any other edition with the labels patched only; `?open=empty` shows the rail's empty text.
// Delete together with /dev/ui.

const SLUGS: Record<string, string> = {
  'event-wp-45458': 'the-sixth-wealthbriefing-wealthtech-americas-awards-2027',
  'event-wp-46721': 'the-fifteenth-wealthbriefingasia-awards-2027',
  'event-wp-46584': 'the-fourteenth-family-wealth-report-awards-2027',
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

type Patch = { set: Record<string, unknown>; unset: string[]; ops: { op: string; path: string; items: unknown[] }[] }

/** The edition with a dry-run patch applied: set, unset, then body appends and inserts after a keyed block. */
function patchEdition(edition: EditionData, patch: Patch | undefined): EditionData {
  if (!patch) {
    return edition
  }

  const next: Record<string, unknown> = { ...edition, ...patch.set }

  for (const field of patch.unset) {
    delete next[field]
  }

  let body = [...((edition.body ?? []) as { _key?: string }[])]

  for (const op of patch.ops) {
    const after = /^body\[_key=="(.+)"\]$/.exec(op.path)?.[1]

    if (op.op === 'append' && op.path === 'body') {
      body = [...body, ...(op.items as { _key?: string }[])]
    } else if (op.op === 'insertAfter' && after) {
      const index = body.findIndex((block) => block._key === after)

      body.splice(index + 1, 0, ...(op.items as { _key?: string }[]))
    }
  }

  return { ...next, body } as unknown as EditionData
}

export default async function AwardsProgrammeReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (process.env.NEXT_PUBLIC_SITE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <Fixture searchParams={searchParams} />
    </Suspense>
  )
}

async function Fixture({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams
  const id = typeof query.edition === 'string' && SLUGS[query.edition] ? query.edition : 'event-wp-45458'
  const slug = typeof query.slug === 'string' ? query.slug : SLUGS[id]
  const { data } = await cachedSanity({ query: AWARDS_PROGRAMME_QUERY, params: { slug }, ...PUBLISHED })

  if (data?._type !== 'awardsProgramme') {
    notFound()
  }

  const today = await cachedUkToday()
  const [{ data: open }, { data: copy }, ads] = await Promise.all([
    cachedSanity({ query: OPEN_AWARDS_QUERY, params: { editionId: data._id, today }, ...PUBLISHED }),
    cachedSanity({ query: AWARDS_PROGRAMME_PAGE_QUERY, params: { id: AWARDS_PROGRAMME_PAGE_ID }, ...PUBLISHED }),
    fetchAdUnits('clearview', 'other', PUBLISHED),
  ])

  if (!copy) {
    notFound()
  }

  const patches = fixture.editions as Record<string, Patch>
  const edition = patchEdition(data, patches[data._id])
  const pageCopy = { ...copy, ...(fixture.page as unknown as Partial<typeof copy>) }

  return (
    <AwardsProgrammePage
      view={toAwardsProgrammeView({
        edition,
        open: query.open === 'empty' ? [] : open,
        copy: pageCopy,
        ads,
        today,
        embedConsent: { text: copy.videoConsentText ?? '', button: copy.videoConsentButton ?? '' },
      })}
    />
  )
}
