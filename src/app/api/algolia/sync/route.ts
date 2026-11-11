import type { NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

import { algoliaBatch } from '@/lib/algolia'
import { cmsSearchRecord, SEARCH_INDEX } from '@/lib/search-index'
import { client } from '@/sanity/client'
import { SEARCH_RECORDS_BY_ID_QUERY } from '@/sanity/queries'

/**
 * POST /api/algolia/sync, called by a Sanity webhook when a post, conference event, awards edition or resource is
 * created, updated or deleted. The webhook sends `{ "_id": "..." }` and signs it with ALGOLIA_WEBHOOK_SECRET.
 *
 * The route reads the published document again rather than trusting the payload: when SEARCH_RECORDS_BY_ID_QUERY
 * returns it, its record is upserted; when it does not (unpublished, deleted, or its slug removed), the record is
 * deleted. A record that is not in the index deletes as a no-op, so replays are harmless.
 *
 * Linked names are copied into the record when it is written, so renaming an author or a category reaches the index
 * on the post's next publish, or on a full run of scripts/algolia/index-records.tsx --cms --write.
 */

// Reads after the write, not from the API CDN, which can lag behind the publish that triggered the webhook.
const sanity = client.withConfig({ useCdn: false, stega: false })

export async function POST(request: NextRequest) {
  const secret = process.env.ALGOLIA_WEBHOOK_SECRET

  if (!secret) {
    console.error('[algolia sync] ALGOLIA_WEBHOOK_SECRET is not set')
    return Response.json({ ok: false, error: 'Not configured.' }, { status: 500 })
  }

  // Waits for Content Lake consistency, so the query below sees the change that fired the webhook.
  const { isValidSignature, body } = await parseBody<{ _id?: unknown }>(request, secret, true)

  if (!isValidSignature) {
    return Response.json({ ok: false, error: 'Invalid signature.' }, { status: 401 })
  }

  // Drafts are not searchable. A draft id never reaches here when the webhook leaves drafts out; this keeps a
  // misconfigured webhook from indexing one.
  const id = typeof body?._id === 'string' ? body._id.replace(/^drafts\./, '') : null

  if (!id || id.includes('.')) {
    return Response.json({ ok: false, error: 'No published document id.' }, { status: 400 })
  }

  try {
    const [doc] = await sanity.fetch(SEARCH_RECORDS_BY_ID_QUERY, { ids: [id] }, { perspective: 'published' })
    const record = doc ? cmsSearchRecord(doc) : null

    await algoliaBatch(SEARCH_INDEX, record ? [record] : [], record ? [] : [id])

    return Response.json({ ok: true, id, action: record ? 'upsert' : 'delete' })
  } catch (error) {
    console.error('[algolia sync]', id, error instanceof Error ? error.message : error)
    return Response.json({ ok: false, error: 'Sync failed.' }, { status: 502 })
  }
}
