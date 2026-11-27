/**
 * One-off: fills `finalistRows` on awards editions from the hand-split legacy Finalists text. Reads one JSON file per
 * edition from the folder given, `{ slug, rows: [{ group, category, categoryMatch, companies[] }] }`; `categoryMatch` is
 * an existing awardCategory id; a shortlist whose category has none is left out (no category is created, its text stays
 * in the legacy field). The images and videos
 * of the legacy `finalists` rich text are copied into `finalistsIntro`; its text is not (the lists are the rows, and
 * the intro lines point at a lost video link). The legacy field stays as it is. Dry run by default; --apply backs up each edition's current rows to
 * docs/internal/backups/ first and patches only editions whose revision has not changed since the read.
 *   bun scripts/migrate-finalist-rows.ts <dir> [--apply]
 * Delete this script after the migration is merged.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createClient } from '@sanity/client'

const dir = process.argv[2]
const apply = process.argv.includes('--apply')
if (!dir || dir.startsWith('--')) throw new Error('Usage: bun scripts/migrate-finalist-rows.ts <dir> [--apply]')

const { NEXT_PUBLIC_SANITY_PROJECT_ID: projectId, NEXT_PUBLIC_SANITY_DATASET: dataset, SANITY_API_WRITE_TOKEN: token } =
  process.env
if (!projectId || !dataset || !token) throw new Error('Missing Sanity env in .env.local.')
const client = createClient({ projectId, dataset, apiVersion: '2026-09-01', useCdn: false, token, perspective: 'raw' })

type SourceRow = { group: string | null; category: string | null; categoryMatch: string | null; companies: string[] }
type Source = { slug: string; rows: SourceRow[] }
type Member = { _type: string; _key: string }
type Edition = {
  _id: string
  _rev: string
  slug: string
  finalistRows?: unknown[]
  finalistsIntro?: Member[]
  finalists?: Member[]
}

const sources: Source[] = readdirSync(dir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as Source)

const editions = await client.fetch<Edition[]>(
  `*[_type == "awardsProgramme" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, _rev, "slug": slug.current, finalistRows, finalistsIntro, finalists }`,
  { slugs: sources.map((source) => source.slug) },
)
const categoryIds = new Set(await client.fetch<string[]>(`*[_type == "awardCategory" && !(_id in path("drafts.**"))]._id`))
const drafts = new Set(
  await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: editions.map((edition) => `drafts.${edition._id}`) }),
)

const clean = (text: string | null) => text?.replace(/\s+/g, ' ').trim() || undefined
let keyCount = 0
const key = () => `fin${(keyCount++).toString(36).padStart(5, '0')}`

const transaction = client.transaction()
const backup: Record<string, unknown> = {}
const totals = { editions: 0, rows: 0, companies: 0, linked: 0, text: 0, media: 0 }

for (const source of sources) {
  const edition = editions.find((item) => item.slug === source.slug)
  if (!edition) {
    console.log(`SKIP ${source.slug}: no published edition`)
    continue
  }

  const rows = source.rows.flatMap((row) => {
    const companies = row.companies.map((company) => clean(company)).filter(Boolean)
    if (companies.length === 0 || (clean(row.category) && !row.categoryMatch)) return []
    if (row.categoryMatch && !categoryIds.has(row.categoryMatch)) throw new Error(`${source.slug}: unknown ${row.categoryMatch}`)

    return [
      {
        _key: key(),
        _type: 'finalistRow',
        categoryGroup: clean(row.group),
        ...(row.categoryMatch ? { category: { _type: 'reference', _ref: row.categoryMatch } } : {}),
        companies: companies.join('\n'),
      },
    ]
  })

  if (rows.length === 0) {
    // Nothing left to show: an earlier run's rows go, so the page falls back to the legacy text.
    if (edition.finalistRows?.length) {
      console.log(`${source.slug}: no rows left, unsets ${edition.finalistRows.length} rows`)
      backup[edition._id] = { finalistRows: edition.finalistRows, finalistsIntro: edition.finalistsIntro ?? null }
      transaction.patch(edition._id, (patch) => patch.ifRevisionId(edition._rev).unset(['finalistRows']))
    } else {
      console.log(`SKIP ${source.slug}: no companies`)
    }
    continue
  }

  const media = (edition.finalists ?? []).filter((member) => member._type !== 'block')
  const linked = rows.filter((row) => 'category' in row).length
  const skipped = source.rows.filter((row) => row.companies.length && clean(row.category) && !row.categoryMatch).length
  const companies = rows.reduce((sum, row) => sum + row.companies.split('\n').length, 0)
  console.log(
    `${source.slug}: ${rows.length} rows, ${companies} companies, ${linked} linked categories, ${skipped} skipped (category without a document)` +
      (media.length ? `, intro: ${media.map((member) => member._type).join(', ')}` : '') +
      (edition.finalistRows?.length ? `, replaces ${edition.finalistRows.length} rows` : '') +
      (edition.finalistsIntro?.length ? `, replaces an intro of ${edition.finalistsIntro.length} members` : '') +
      (drafts.has(`drafts.${edition._id}`) ? ' (has an unpublished draft: not touched)' : ''),
  )
  Object.assign(totals, {
    editions: totals.editions + 1,
    rows: totals.rows + rows.length,
    companies: totals.companies + companies,
    linked: totals.linked + linked,
    text: totals.text + skipped,
    media: totals.media + media.length,
  })
  backup[edition._id] = { finalistRows: edition.finalistRows ?? null, finalistsIntro: edition.finalistsIntro ?? null }
  transaction.patch(edition._id, (patch) =>
    patch.ifRevisionId(edition._rev).set(media.length ? { finalistRows: rows, finalistsIntro: media } : { finalistRows: rows }),
  )
}

console.log(
  `\n${totals.editions} editions, ${totals.rows} rows, ${totals.companies} companies, ${totals.linked} linked categories, ${totals.text} skipped, ${totals.media} intro media.`,
)

if (!apply) {
  console.log('Dry run. Pass --apply to write.')
  process.exit(0)
}

mkdirSync('docs/internal/backups', { recursive: true })
const backupPath = `docs/internal/backups/finalist-rows-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(backupPath, JSON.stringify(backup, null, 2))
console.log(`Backup: ${backupPath}`)

const result = await transaction.commit()
console.log(`Patched ${totals.editions} editions (transaction ${result.transactionId}).`)
