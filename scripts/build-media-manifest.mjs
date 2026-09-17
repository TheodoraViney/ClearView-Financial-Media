#!/usr/bin/env node
/**
 * Build the media manifest for the ClearView awards/events migration.
 *
 * Walks the two source dumps in .migration-source/ and emits every WordPress
 * attachment id the content actually references, with provenance: which record
 * type, which record, which source field, and where that image lands in the
 * Sanity schema.
 *
 * Reads local files only. Nothing here touches clearviewpublishing.com; written
 * permission to crawl client infrastructure is still an open item. The output of
 * this script is the input to scripts/wp-media-extract.js, which the user runs
 * himself in a logged-in browser.
 *
 * Why a manifest at all, rather than pulling the whole media library:
 *   the library holds 26,950 files against 275 content records, and a 170-file
 *   sample came back 97% unattached. Walking references is the only way to know
 *   which files a migrated document will ever point at. See README section 4.
 *
 * Why attachments are collected from a fixed field list and not by sniffing for
 * numeric values: the source is full of numeric ids that are NOT attachments -
 * `cyph_venue`, `cyph_judges`, `cyph_sponsors`, `td_company`, `pods_meta_people`
 * and `pods_meta_company` are all post_object / pick relations pointing at
 * Companies and People. A heuristic that treats "short numeric string" as an
 * attachment would pull 1,500 company ids into the download queue. The field
 * list below is taken from the ACF/Pods field dumps in .migration-source/ and is
 * asserted against them at run time.
 *
 * Why `thumbnailId` is not a source: it reads "-1" on all 255 events and 7 of 8
 * acclaim records, which is WordPress for "no featured image". The one record
 * that carries a real value is reported as a warning rather than skipped
 * silently - see WARN_FEATURED below.
 *
 * Nesting: ACF serialises group and repeater fields as
 * `acf[parent][row-0][leaf]`, so a field is matched on its LEAF key anywhere in
 * the path, never on the whole string. Two different fields in this schema share
 * the name `cyph_categories` at different depths, which is why names are never
 * used as keys.
 *
 * Usage:
 *     node scripts/build-media-manifest.mjs
 *     node scripts/build-media-manifest.mjs .migration-source/inline-image-ids.json
 *
 * The optional argument is the inline-image id list produced by the HTML ->
 * Portable Text converter (ids harvested from `wp-image-{id}` classes in body
 * markup). It is optional on purpose: the two pipelines run in parallel and this
 * one must not block on the other. When it is absent the script still reports
 * how many inline ids it can see in the corpus itself, so the gap is visible.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const SOURCE_DIR = '.migration-source'
const EVENTS_FILE = `${SOURCE_DIR}/wp-events.json`
const SOURCE_FILE = `${SOURCE_DIR}/wp-source.json`
const DEFAULT_INLINE_FILE = `${SOURCE_DIR}/inline-image-ids.json`

const OUT_MANIFEST = `${SOURCE_DIR}/media-manifest.json`
const OUT_IDS = `${SOURCE_DIR}/media-ids.js`
const OUT_SUMMARY = `${SOURCE_DIR}/media-manifest.md`

/**
 * The field dumps these keys are asserted against. If a dump stops mentioning a
 * key the run fails rather than quietly collecting nothing: a field renamed in
 * WordPress must be noticed here, not discovered as a missing logo after import.
 */
const FIELD_DUMPS = [
  `${SOURCE_DIR}/acf-fields-event.tsv`,
  `${SOURCE_DIR}/fields-acclaim.tsv`,
  `${SOURCE_DIR}/fields-resource.tsv`,
  `${SOURCE_DIR}/acf-fields-company.tsv`,
  `${SOURCE_DIR}/acf-fields-person.tsv`,
]

/**
 * Every field in the source that carries an attachment id.
 *
 * `kind: 'acf'` matches on the leaf field key inside `acf[...]`.
 * `kind: 'pods'` matches the whole Pods meta key, whose value is the
 * `[{value, label}]` shape scripts/wp-extract.js normalises relations into.
 *
 * `sanityPath` is where the image lands in src/sanity/schema/. It is carried
 * into the manifest so the loader never has to re-derive the mapping, and so a
 * field with no home in the schema is visible as an empty string here.
 */
const IMAGE_FIELDS = [
  {
    kind: 'acf',
    key: 'field_62d1891cc92b6',
    name: 'cyph_event_logo',
    sourceTypes: ['events'],
    role: 'eventLogo',
    sanityPath: 'logo',
    multiple: false,
  },
  {
    kind: 'acf',
    key: 'field_64493bef68fc4',
    name: 'highlight_video_thumbnail',
    sourceTypes: ['events'],
    role: 'highlightVideoThumbnail',
    sanityPath: 'highlightVideoThumbnail',
    multiple: false,
    // Only awardsProgramme declares this field. Enforced by CHECK_FIELD_HOME.
    onlySanityTypes: ['awardsProgramme'],
  },
  {
    kind: 'acf',
    key: 'field_634816890983c',
    name: 'cyph_winners_videos.cyph_thumbnail_image',
    sourceTypes: ['events'],
    role: 'winnerVideosThumbnail',
    sanityPath: 'winnerVideos.thumbnail',
    multiple: false,
    onlySanityTypes: ['awardsProgramme'],
  },
  {
    kind: 'acf',
    key: 'field_63664c8436e2d',
    name: 'cyph_sponsors_videos.cyph_thumbnail_spon_image',
    sourceTypes: ['events'],
    role: 'sponsorVideosThumbnail',
    sanityPath: 'sponsorVideos.thumbnail',
    multiple: false,
  },
  {
    kind: 'acf',
    key: 'field_62d19a91ef48c',
    name: 'cyph_photographs',
    sourceTypes: ['events'],
    role: 'photographsGallery',
    sanityPath: 'photographs[]',
    multiple: true,
  },
  {
    kind: 'acf',
    key: 'field_693bee549278c',
    name: 'acc_thumbnail_image',
    sourceTypes: ['acclaim'],
    role: 'acclaimThumbnail',
    sanityPath: 'thumbnailImage',
    multiple: false,
  },
  {
    kind: 'acf',
    key: 'field_669a8b0899235',
    name: 'download_thumbnail',
    sourceTypes: ['resource'],
    role: 'resourceDownloadThumbnail',
    sanityPath: 'downloadThumbnail',
    multiple: false,
  },
  {
    kind: 'pods',
    key: 'pods_meta_logo',
    name: 'logo',
    sourceTypes: ['companies'],
    role: 'companyLogo',
    sanityPath: 'logo',
    multiple: false,
  },
  {
    kind: 'pods',
    key: 'pods_meta_photo',
    name: 'photo',
    sourceTypes: ['people'],
    role: 'personPhoto',
    sanityPath: 'photo',
    multiple: false,
  },
]

/** Source post type -> Sanity document type. Events split further, see sanityTypeOf(). */
const SANITY_TYPE = {
  acclaim: 'acclaim',
  resource: 'resource',
  companies: 'company',
  people: 'person',
}

/**
 * The events split is by `events-category` term, not by which fields are filled.
 * Term 6 is `awards`; 8 summits, 9 webinar, 21 briefings. "0" is the empty
 * hidden input WordPress emits before a checkbox group and is not a term.
 *
 * Record 2877 carries no term at all and is loaded as conferenceEvent pending a
 * client answer, which is what the `else` branch gives it.
 */
const AWARDS_TERM = '6'

function sanityTypeOf(sourceType, record) {
  if (sourceType !== 'events') return SANITY_TYPE[sourceType] ?? sourceType
  return eventTerms(record).includes(AWARDS_TERM) ? 'awardsProgramme' : 'conferenceEvent'
}

function eventTerms(record) {
  const raw = record.fields?.['tax_input[events_category]']
  const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
  return list.map(String).filter((t) => t !== '0')
}

// --- reading ---------------------------------------------------------------

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    fail(`cannot read ${path}: ${err.message}`)
  }
}

function fail(message) {
  console.error(`\nbuild-media-manifest: ${message}`)
  process.exit(1)
}

/** Leaf ACF field key of a serialised path, e.g. acf[a][row-0][field_x] -> field_x. */
function leafFieldKey(key) {
  const parts = [...key.matchAll(/\[([^\]]+)\]/g)]
    .map((m) => m[1])
    .filter((p) => p.startsWith('field_'))
  return parts.length ? parts[parts.length - 1] : null
}

/**
 * An attachment id as WordPress means it: a positive integer.
 * Rejects "", "0", "-1" and the `{value,label}` husk of an emptied relation.
 */
function attachmentId(raw) {
  const value = raw && typeof raw === 'object' ? raw.value : raw
  if (value == null) return null
  const id = String(value).trim()
  return /^[1-9]\d*$/.test(id) ? id : null
}

// --- collection ------------------------------------------------------------

const refs = []
const warnings = []
const skipped = []

function pushRef(ref) {
  refs.push(ref)
}

function collectFromRecord(sourceType, record) {
  const sanityType = sanityTypeOf(sourceType, record)
  const base = {
    sourceType,
    recordId: String(record.id),
    recordTitle: record.title ?? null,
    recordSlug: record.slug ?? null,
    sanityType,
  }

  for (const [rawKey, rawValue] of Object.entries(record.fields ?? {})) {
    const spec = IMAGE_FIELDS.find((f) =>
      f.kind === 'acf' ? leafFieldKey(rawKey) === f.key : rawKey === f.key,
    )
    if (!spec) continue
    if (!spec.sourceTypes.includes(sourceType)) {
      warnings.push(
        `${spec.name} (${spec.key}) appeared on ${sourceType} record ${record.id}, ` +
          `which the field map does not expect`,
      )
      continue
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    values.forEach((value, index) => {
      const id = attachmentId(value)
      if (id == null) {
        if (value != null && value !== '' && value !== '0')
          skipped.push({ ...base, fieldKey: rawKey, value: JSON.stringify(value).slice(0, 80) })
        return
      }
      pushRef({
        ...base,
        origin: 'field',
        fieldKey: rawKey,
        fieldId: spec.key,
        fieldName: spec.name,
        role: spec.role,
        sanityPath: spec.sanityPath,
        index: spec.multiple ? index : null,
      })
      byId(id).push(refs[refs.length - 1])
    })
  }

  // A real featured image is not a source here, but it must not vanish quietly.
  const featured = attachmentId(record.thumbnailId)
  if (featured != null) {
    warnings.push(
      `${sourceType} record ${record.id} has a real featured image (thumbnailId ${featured}); ` +
        `_thumbnail_id reads "-1" everywhere else. It is included with role featuredImage, ` +
        `but no Sanity field is mapped to it - confirm where it should land`,
    )
    pushRef({
      ...base,
      origin: 'field',
      fieldKey: '_thumbnail_id',
      fieldId: '_thumbnail_id',
      fieldName: 'featured image',
      role: 'featuredImage',
      sanityPath: '',
      index: null,
    })
    byId(featured).push(refs[refs.length - 1])
  }
}

/** id -> list of references. A Map keeps insertion order stable across runs. */
const index = new Map()
function byId(id) {
  let list = index.get(id)
  if (!list) index.set(id, (list = []))
  return list
}

// --- inline ids ------------------------------------------------------------

/**
 * Accepts any of the shapes the converter might reasonably emit:
 *   [123, 456]
 *   ["123", "456"]
 *   { ids: [...] }
 *   { attachments: [...] }
 *   [{ id, sourceType, recordId, field }]
 * Anything else is a hard failure, because a silently misread inline list looks
 * exactly like an empty one.
 */
function readInlineIds(path) {
  const raw = readJson(path)
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.ids)
      ? raw.ids
      : Array.isArray(raw?.attachments)
        ? raw.attachments
        : null
  if (!list) fail(`${path} is not an array, {ids:[...]} or {attachments:[...]}`)

  return list.map((entry, i) => {
    const id = attachmentId(typeof entry === 'object' && entry ? entry.id : entry)
    if (id == null) fail(`${path}: entry ${i} is not an attachment id (${JSON.stringify(entry)})`)
    const meta = typeof entry === 'object' && entry ? entry : {}
    return {
      id,
      sourceType: meta.sourceType ?? meta.postType ?? null,
      recordId: meta.recordId != null ? String(meta.recordId) : null,
      recordTitle: meta.recordTitle ?? null,
      fieldKey: meta.fieldKey ?? meta.field ?? null,
    }
  })
}

/**
 * Independent count of `wp-image-{id}` classes in the corpus.
 *
 * Advisory only - the converter owns the authoritative list, because it knows
 * which fields it converted and can attach real provenance. This exists so that
 * a converter list which disagrees with the raw markup is visible immediately
 * rather than at reconciliation time. Trap 2 in MIGRATION-CONTEXT is a run that
 * reported "1200 of 1200" for a set holding 1451; a second independent count is
 * the cheapest defence against the same shape of failure here.
 */
function scanInlineIds(groups) {
  const found = new Set()
  for (const [, records] of groups) {
    for (const record of records) {
      const blobs = [record.content, ...Object.values(record.fields ?? {})]
      for (const blob of blobs) {
        if (typeof blob !== 'string') continue
        for (const m of blob.matchAll(/wp-image-(\d+)/g)) {
          const id = attachmentId(m[1])
          if (id != null) found.add(id)
        }
      }
    }
  }
  return found
}

// --- run -------------------------------------------------------------------

const argv = process.argv.slice(2)
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node scripts/build-media-manifest.mjs [inline-ids.json]')
  process.exit(0)
}
const inlinePath = argv.find((a) => !a.startsWith('-')) ?? DEFAULT_INLINE_FILE

// Assert the field map still matches the dumps before collecting anything.
const dumpText = FIELD_DUMPS.map((p) => {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    warnings.push(`field dump ${p} is missing, its keys could not be asserted`)
    return ''
  }
}).join('\n')
const unasserted = IMAGE_FIELDS.filter((f) => f.kind === 'acf' && !dumpText.includes(f.key))
if (unasserted.length)
  fail(
    `these ACF keys are in the field map but in none of the field dumps: ` +
      unasserted.map((f) => `${f.key} (${f.name})`).join(', '),
  )

const events = readJson(EVENTS_FILE)
const source = readJson(SOURCE_FILE)

const groups = [
  ['events', events.records ?? []],
  ...Object.entries(source.types ?? {}).map(([type, payload]) => [type, payload.records ?? []]),
]

// An empty type in the dump is a truncated run, not an empty CPT. `resources`
// sits at 0 next to `resource` at 12 because of a slug typo on an earlier pass.
for (const [type, records] of groups) {
  const declared = type === 'events' ? events.counts?.found : source.types?.[type]?.counts?.found
  if (declared != null && declared !== records.length)
    warnings.push(
      `${type}: dump declares ${declared} records found but carries ${records.length} - ` +
        `the extraction was short, re-run before trusting this manifest`,
    )
  if (!records.length) {
    warnings.push(`${type}: 0 records in the dump, contributing nothing to the manifest`)
    continue
  }
  for (const record of records) collectFromRecord(type, record)
}

const fieldIds = new Set(index.keys())

// Inline ids, merged in with their own provenance.
const corpusInline = scanInlineIds(groups)
let inlineIds = []
let inlinePresent = false
try {
  readFileSync(resolve(inlinePath))
  inlinePresent = true
} catch {
  /* optional by design */
}
if (inlinePresent) {
  inlineIds = readInlineIds(inlinePath)
  for (const entry of inlineIds) {
    pushRef({
      origin: 'inline',
      sourceType: entry.sourceType,
      recordId: entry.recordId,
      recordTitle: entry.recordTitle,
      recordSlug: null,
      sanityType: null,
      fieldKey: entry.fieldKey,
      fieldId: null,
      fieldName: 'body HTML',
      role: 'inlineBodyImage',
      sanityPath: 'richText image block',
      index: null,
    })
    byId(entry.id).push(refs[refs.length - 1])
  }

  const supplied = new Set(inlineIds.map((e) => e.id))
  const missedByConverter = [...corpusInline].filter((id) => !supplied.has(id))
  const notInCorpus = [...supplied].filter((id) => !corpusInline.has(id))
  if (missedByConverter.length)
    warnings.push(
      `${missedByConverter.length} wp-image ids are in the body markup but not in ${basename(inlinePath)}: ` +
        missedByConverter.slice(0, 20).join(', ') +
        (missedByConverter.length > 20 ? ', ...' : ''),
    )
  if (notInCorpus.length)
    warnings.push(
      `${notInCorpus.length} ids in ${basename(inlinePath)} carry no wp-image-{id} class in the dumps: ` +
        notInCorpus.slice(0, 20).join(', ') +
        (notInCorpus.length > 20 ? ', ...' : ''),
    )
} else {
  warnings.push(
    `${inlinePath} not supplied. The dumps themselves carry ${corpusInline.size} distinct ` +
      `wp-image-{id} references, of which ${[...corpusInline].filter((id) => !fieldIds.has(id)).length} ` +
      `are not reached by any field. Re-run once the converter emits the list.`,
  )
}

// --- assemble --------------------------------------------------------------

const ids = [...index.keys()].sort((a, b) => Number(a) - Number(b))

const attachments = ids.map((id) => {
  const list = index.get(id)
  return {
    id,
    refCount: list.length,
    roles: [...new Set(list.map((r) => r.role))],
    origins: [...new Set(list.map((r) => r.origin))],
    refs: list.map((r) => ({
      origin: r.origin,
      sourceType: r.sourceType,
      recordId: r.recordId,
      recordTitle: r.recordTitle,
      sanityType: r.sanityType,
      sanityPath: r.sanityPath,
      role: r.role,
      fieldKey: r.fieldKey,
      fieldName: r.fieldName,
      ...(r.index == null ? {} : { index: r.index }),
    })),
  }
})

const tally = (key, filter = () => true) => {
  const out = {}
  for (const r of refs) if (filter(r)) out[r[key] ?? '(none)'] = (out[r[key] ?? '(none)'] ?? 0) + 1
  return out
}
const distinctBy = (key) => {
  const out = {}
  for (const [id, list] of index)
    for (const k of new Set(list.map((r) => r[key] ?? '(none)'))) (out[k] ??= new Set()).add(id)
  return Object.fromEntries(
    Object.entries(out)
      .map(([k, v]) => [k, v.size])
      .sort((a, b) => b[1] - a[1]),
  )
}

// A field that maps to no Sanity path has nowhere to land. §8.3 of
// MIGRATION-CONTEXT: every non-empty source field either has an address in the
// schema or sits on an explicit ignore list with a reason.
const homeless = refs.filter((r) => r.origin === 'field' && r.sanityPath === '')
if (homeless.length)
  warnings.push(
    `${homeless.length} references point at a field with no Sanity path: ` +
      [...new Set(homeless.map((r) => r.fieldName))].join(', '),
  )

// A field restricted to one Sanity type must not appear on the other one.
for (const spec of IMAGE_FIELDS) {
  if (!spec.onlySanityTypes) continue
  const strays = refs.filter(
    (r) => r.fieldId === spec.key && !spec.onlySanityTypes.includes(r.sanityType),
  )
  if (strays.length)
    warnings.push(
      `${spec.name} is only declared on ${spec.onlySanityTypes.join('/')} in the schema, but ` +
        `${strays.length} references sit on ${[...new Set(strays.map((r) => r.sanityType))].join(', ')}: ` +
        `records ${[...new Set(strays.map((r) => r.recordId))].slice(0, 10).join(', ')}`,
    )
}

const shared = attachments.filter((a) => a.roles.length > 1)
if (shared.length)
  warnings.push(
    `${shared.length} attachments are referenced under more than one role, so the ` +
      `per-role counts sum higher than the distinct total: ` +
      shared.map((a) => `${a.id} (${a.roles.join(' + ')})`).join('; '),
  )

const manifest = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/build-media-manifest.mjs',
  inputs: {
    events: {
      file: EVENTS_FILE,
      extractedAt: events.extractedAt ?? null,
      records: events.records?.length ?? 0,
    },
    source: {
      file: SOURCE_FILE,
      extractedAt: source.extractedAt ?? null,
      records: Object.fromEntries(
        Object.entries(source.types ?? {}).map(([t, v]) => [t, v.records?.length ?? 0]),
      ),
    },
    inline: {
      file: inlinePath,
      present: inlinePresent,
      supplied: inlineIds.length,
      seenInCorpus: corpusInline.size,
    },
  },
  counts: {
    distinct: ids.length,
    distinctFromFields: fieldIds.size,
    distinctFromInlineOnly: ids.length - fieldIds.size,
    references: refs.length,
    distinctByRole: distinctBy('role'),
    distinctBySourceType: distinctBy('sourceType'),
    distinctBySanityType: distinctBy('sanityType'),
    referencesByRole: tally('role'),
  },
  warnings,
  ids,
  attachments,
}
manifest.idsChecksum = createHash('sha256').update(ids.join(',')).digest('hex').slice(0, 16)

writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2))

// A paste-first bootstrap for the browser console: the extractor cannot read a
// file off disk, and 6,648 ids is a 50 KB paste, which Chrome handles fine.
writeFileSync(
  OUT_IDS,
  `// Generated by scripts/build-media-manifest.mjs. Paste this into the wp-admin\n` +
    `// console BEFORE scripts/wp-media-extract.js.\n` +
    `globalThis.WP_MEDIA_IDS = ${JSON.stringify(ids)};\n` +
    `globalThis.WP_MEDIA_CHECKSUM = ${JSON.stringify(manifest.idsChecksum)};\n` +
    `console.log('ids: ' + globalThis.WP_MEDIA_IDS.length + ', checksum ' + globalThis.WP_MEDIA_CHECKSUM);\n`,
)

const table = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n')

const summary = `# Media manifest

Generated ${manifest.generatedAt} by \`scripts/build-media-manifest.mjs\`.
Not in git: \`.migration-source/\` is ignored.

**${ids.length} distinct attachment ids** across ${refs.length} references.
Checksum \`${manifest.idsChecksum}\`.

## Distinct ids by role

| role | distinct ids |
| --- | --- |
${table(manifest.counts.distinctByRole)}

Roles overlap: ${shared.length} ids carry more than one, so this column sums to
${Object.values(manifest.counts.distinctByRole).reduce((a, b) => a + b, 0)}, not ${ids.length}.

## Distinct ids by source type

| source CPT | distinct ids |
| --- | --- |
${table(manifest.counts.distinctBySourceType)}

## Distinct ids by target Sanity type

| Sanity type | distinct ids |
| --- | --- |
${table(manifest.counts.distinctBySanityType)}

## Inline body images

${
  inlinePresent
    ? `Supplied: ${inlineIds.length} from \`${inlinePath}\`. Independently visible in the dumps: ${corpusInline.size}.`
    : `Not supplied. \`${inlinePath}\` does not exist yet.\nThe dumps carry ${corpusInline.size} distinct \`wp-image-{id}\` references, ${[...corpusInline].filter((id) => !fieldIds.has(id)).length} of which no field reaches. Re-run this script once the converter emits the list.`
}

## Warnings

${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : 'None.'}

## Next step

\`\`\`
1. paste .migration-source/media-ids.js   into the wp-admin console
2. paste scripts/wp-media-extract.js      into the same console
3. wpMediaSave()                          when it finishes
\`\`\`
`

writeFileSync(OUT_SUMMARY, summary)

// --- report ----------------------------------------------------------------

console.log(`\n  ${ids.length} distinct attachment ids, ${refs.length} references`)
console.log(`  checksum ${manifest.idsChecksum}\n`)
for (const [role, n] of Object.entries(manifest.counts.distinctByRole))
  console.log(`    ${role.padEnd(28)} ${String(n).padStart(5)}`)
console.log(`    ${'-'.repeat(28)} ${'-'.repeat(5)}`)
console.log(`    ${'distinct'.padEnd(28)} ${String(ids.length).padStart(5)}`)

if (skipped.length) {
  console.log(`\n  ${skipped.length} field values were not usable as attachment ids:`)
  for (const s of skipped.slice(0, 10))
    console.log(`    ${s.sourceType} ${s.recordId} ${s.fieldKey} = ${s.value}`)
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`)
  for (const w of warnings) console.log(`    - ${w}`)
}

console.log(`\n  wrote ${OUT_MANIFEST}`)
console.log(`  wrote ${OUT_IDS}`)
console.log(`  wrote ${OUT_SUMMARY}\n`)
