/**
 * One-off migration for the subscribe pop-up. Dry run by default: prints every write and changes nothing.
 *
 *   bun scripts/seed-subscribe-modal.ts --phase=migrate [--apply]
 *
 * Run only once the new schema is deployed, or the live headers lose their Subscribe button. Copies the header and
 * banner button labels into the new label fields and clears the old link fields, clears the old list and confirmation
 * email on every newsletter signup block, and clears the fields the schema no longer has: the Country and Industry
 * lists of the settings document (they come from Brevo now) and the "already confirmed" success copy of the pop-up
 * documents. Patches with ifRevisionId.
 *
 * Needs SANITY_API_WRITE_TOKEN in .env.local. Stops when any touched document has a draft. After a write, delete
 * .next/dev/cache with the dev server stopped.
 */
import { createClient, type SanityDocument } from '@sanity/client'

import { BRAND_KEYS, EDITORIAL_BRAND_KEYS, SUBSCRIBE_FORM_SETTINGS_ID, headerDocumentId, subscribeModalDocumentId } from '@/brands'

/** Fields the schema no longer has, cleared by migrate where they are set. */
const REMOVED_SETTINGS_FIELDS = ['countries', 'industries']
const REMOVED_MODAL_FIELDS = ['confirmedTitle', 'confirmedText']

// ---------------------------------------------------------------------------------------------------------------

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const phase = args.find((arg) => arg.startsWith('--phase='))?.slice('--phase='.length)

if (phase !== 'migrate') {
  console.error('Usage: bun scripts/seed-subscribe-modal.ts --phase=migrate [--apply]')
  process.exit(1)
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !dataset || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET or SANITY_API_WRITE_TOKEN in .env.local.')
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion: '2026-09-01', useCdn: false, token, perspective: 'raw' })

type Operation = {
  id: string
  rev: string
  set: Record<string, unknown>
  unset: string[]
  summary: string
}

type BlockWithKey = { _key: string; _type: string; cta?: { label?: string }; list?: unknown; confirmationTemplate?: unknown }

async function planMigrate(): Promise<Operation[]> {
  const operations: Operation[] = []
  const headerIds = EDITORIAL_BRAND_KEYS.map(headerDocumentId)
  const headers = await client.fetch<SanityDocument[]>('*[_id in $ids]', { ids: headerIds })

  for (const header of headers) {
    const old = header.subscribe as { label?: string } | undefined

    if (old === undefined && header.subscribeLabel) {
      console.log(`skip    ${header._id} (already migrated)`)
      continue
    }

    const label = String(header.subscribeLabel ?? old?.label ?? 'Subscribe')

    operations.push({
      id: header._id,
      rev: header._rev,
      set: { subscribeLabel: label },
      unset: old === undefined ? [] : ['subscribe'],
      summary: `subscribeLabel = "${label}", unset subscribe`,
    })
  }

  const removed = await client.fetch<SanityDocument[]>('*[_id in $ids]', {
    ids: [SUBSCRIBE_FORM_SETTINGS_ID, ...BRAND_KEYS.map(subscribeModalDocumentId)],
  })

  for (const doc of removed) {
    const fields = (doc._id === SUBSCRIBE_FORM_SETTINGS_ID ? REMOVED_SETTINGS_FIELDS : REMOVED_MODAL_FIELDS).filter(
      (field) => doc[field] !== undefined,
    )

    if (fields.length === 0) {
      console.log(`skip    ${doc._id} (no removed fields)`)
      continue
    }

    operations.push({ id: doc._id, rev: doc._rev, set: {}, unset: fields, summary: `unset ${fields.join(', ')}` })
  }

  const pages = await client.fetch<SanityDocument[]>(
    `*[_type == "page" && !(_id in path("drafts.**")) && count(blocks[_type in ["subscribeBanner", "newsletterSignup"]]) > 0]`,
  )

  for (const page of pages) {
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    const notes: string[] = []

    for (const block of (page.blocks as BlockWithKey[]) ?? []) {
      const at = `blocks[_key=="${block._key}"]`

      if (block._type === 'subscribeBanner' && block.cta !== undefined) {
        const label = block.cta.label?.trim() || 'Subscribe to the daily newsletter'

        set[`${at}.buttonLabel`] = label
        unset.push(`${at}.cta`)
        notes.push(`banner ${block._key}: buttonLabel = "${label}", unset cta`)
      }

      if (block._type === 'newsletterSignup' && (block.list !== undefined || block.confirmationTemplate !== undefined)) {
        unset.push(`${at}.list`, `${at}.confirmationTemplate`)
        notes.push(`signup ${block._key}: unset list, confirmationTemplate`)
      }
    }

    if (notes.length === 0) {
      console.log(`skip    ${page._id} (already migrated)`)
      continue
    }

    operations.push({ id: page._id, rev: page._rev, set, unset, summary: notes.join('; ') })
  }

  return operations
}

/** Stops when a touched document has a draft: a write to the published version would be hidden by it. */
async function assertNoDrafts(ids: string[]) {
  const drafts = await client.fetch<string[]>('*[_id in $ids]._id', { ids: ids.map((id) => `drafts.${id}`) })

  if (drafts.length > 0) {
    throw new Error(`Drafts exist; publish or discard them first:\n- ${drafts.join('\n- ')}`)
  }
}

async function main() {
  console.log(`Phase ${phase}, ${apply ? 'APPLY' : 'dry run'} on ${projectId}/${dataset}\n`)

  const operations = await planMigrate()
  const ids = operations.map((operation) => operation.id)

  for (const operation of operations) {
    console.log(`patch   ${operation.id}: ${operation.summary}`)
  }

  console.log(`\n${operations.length} ${operations.length === 1 ? 'write' : 'writes'} planned.`)

  if (operations.length === 0) {
    return
  }

  await assertNoDrafts(ids)

  if (!apply) {
    console.log('Dry run: nothing written. Add --apply to write.')
    return
  }

  const transaction = client.transaction()

  for (const operation of operations) {
    transaction.patch(operation.id, (patch) => {
      let next = patch.ifRevisionId(operation.rev)

      if (Object.keys(operation.set).length > 0) next = next.set(operation.set)
      if (operation.unset.length > 0) next = next.unset(operation.unset)

      return next
    })
  }

  const result = await transaction.commit()

  console.log(`Written: transaction ${result.transactionId}. Now delete .next/dev/cache with the dev server stopped.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
