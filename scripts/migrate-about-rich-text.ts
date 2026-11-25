/**
 * One-off migration for the ClearView About page, DRY RUN by default.
 *
 * Five block fields changed from plain text to rich text (`paragraphsBlock` paragraphs): Coverage list topic
 * `description`, Image with figure `text`, Team and publications `body` and `quote`, Contact panel `text`. The page
 * `page-about-clearview` still stores them as strings, which the new projections read as null. This rewrites each
 * string as paragraphs (one per blank-line-separated part), leaving fields that are already arrays alone.
 *
 * Usage:
 *   bun --env-file=.env.local scripts/migrate-about-rich-text.ts            # prints the patch, writes nothing
 *   bun --env-file=.env.local scripts/migrate-about-rich-text.ts --apply    # backs up the page, then patches it
 *
 * Stops when a draft or a release version of the page exists (publishing it would bring the strings back). The
 * patch carries `ifRevisionId`, so it fails if the page changed after it was read. The backup goes to
 * docs/internal/backups/. Delete this script after use.
 */
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createClient } from '@sanity/client'

const PAGE_ID = 'page-about-clearview'
const BACKUP_DIR = 'docs/internal/backups'

// The converted fields per block type. Coverage list topics are handled apart (one level down).
const BLOCK_FIELDS: Record<string, string[]> = {
  recordFeature: ['text'],
  teamNetwork: ['body', 'quote'],
  cta: ['text'],
}

const apply = process.argv.includes('--apply')
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = apply ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN

if (!projectId || !dataset || !token) {
  console.error(
    `Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET or ${apply ? 'SANITY_API_WRITE_TOKEN' : 'SANITY_API_READ_TOKEN'}`,
  )
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion: '2026-09-01', useCdn: false, token, perspective: 'raw' })

const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

/** A string as `paragraphsBlock` paragraphs: one per blank-line-separated part, no marks. */
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: key(), text: part, marks: [] }],
    }))

// --- Checks ----------------------------------------------------------------------------------------------------------

const versions = await client.fetch<{ _id: string }[]>(
  `*[_id == $draft || (_id in path("versions.**") && string::split(_id, ".")[2] == $id)]{ _id }`,
  { id: PAGE_ID, draft: `drafts.${PAGE_ID}` },
)

if (versions.length > 0) {
  console.error(`Stopping: unpublished versions exist: ${versions.map((doc) => doc._id).join(', ')}. Publish or discard them first.`)
  process.exit(1)
}

type Block = { _key: string; _type: string; items?: { _key: string; description?: unknown }[] } & Record<string, unknown>
type Page = { _id: string; _rev: string; blocks?: Block[] }

const page = await client.fetch<Page | null>(`*[_id == $id][0]`, { id: PAGE_ID })

if (!page) {
  console.error(`Stopping: ${PAGE_ID} not found.`)
  process.exit(1)
}

// --- The patch -------------------------------------------------------------------------------------------------------

const set: Record<string, unknown> = {}

for (const block of page.blocks ?? []) {
  const path = `blocks[_key=="${block._key}"]`

  for (const field of BLOCK_FIELDS[block._type] ?? []) {
    const value = block[field]

    if (typeof value === 'string') {
      set[`${path}.${field}`] = paragraphs(value)
    }
  }

  if (block._type === 'coverageList') {
    for (const item of block.items ?? []) {
      if (typeof item.description === 'string') {
        set[`${path}.items[_key=="${item._key}"].description`] = paragraphs(item.description)
      }
    }
  }
}

const paths = Object.keys(set)

if (paths.length === 0) {
  console.log(`Nothing to do: ${PAGE_ID} has no string values left in the converted fields.`)
  process.exit(0)
}

if (!apply) {
  console.log(JSON.stringify({ id: PAGE_ID, ifRevisionId: page._rev, set }, null, 2))
  console.log(`\nDRY RUN. Would back up ${PAGE_ID} (rev ${page._rev}) and set ${paths.length} fields:`)
  paths.forEach((path) => console.log(`  ${path}`))
  process.exit(0)
}

mkdirSync(BACKUP_DIR, { recursive: true })
const backup = join(BACKUP_DIR, `about-rich-text-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(backup, `${JSON.stringify(page, null, 2)}\n`)
console.log(`backed up ${PAGE_ID} -> ${backup}`)

const patched = await client.patch(PAGE_ID).ifRevisionId(page._rev).set(set).commit()
console.log(`patched ${patched._id} (rev ${patched._rev}), ${paths.length} fields`)
