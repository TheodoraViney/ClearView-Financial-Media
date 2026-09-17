#!/usr/bin/env node
/**
 * ClearView WordPress events/awards -> Sanity loader.
 *
 * Reads the four verified extracts in `.migration-source/`, builds every Sanity
 * document in memory, proves the result before it writes anything, and only
 * then writes. Dry run is the default; `--commit` is the only way to write, and
 * `--dataset production` is refused outright.
 *
 * Every number in the comments below was measured on the extracts dated
 * 2026-09-15 (events, source), 2026-09-15 (winners) and 2026-09-17 (media), by
 * running this file with `--dataset migration-dev`. Re-run after any
 * re-extract; the numbers move and the assertions are written to notice.
 *
 * ## Why this file is mostly bookkeeping
 *
 * The migration's real failure mode is not a crash. It is a field that quietly
 * has nowhere to go: 78 ACF fields on Event, 18 of them wysiwyg, two plugins,
 * a repeater nested three deep, and a schema written from a reading of those
 * fields rather than from the fields themselves. README describes the same
 * class of failure on the archive - "3,345 silently return a different article
 * with a 200... The silent kind reports success and appears in no error log."
 *
 * So the rule, from MIGRATION-CONTEXT section 8: every non-empty source field
 * either lands somewhere in the schema or sits in IGNORED below with a written
 * reason. Anything else is a BLOCKER and refuses the write. `consume()` and
 * `leafOf()` are how that is enforced - not by reading the field map and
 * hoping, but by diffing the map against the actual keys in the actual dump.
 *
 * ## What is deliberately not automatic
 *
 * Five decisions are implemented as one switch each, because they are content
 * decisions and not technical ones. They are listed by `--help` and every one
 * is reported by name on every run:
 *
 *   --inline-foreign-images   49 of 116 inline images live on hosts that are
 *                             not the WordPress library (MIGRATION-CONTEXT
 *                             section 7 item 5). Default drops them.
 *   --unpublished             11 of 255 events are draft/pending/private in
 *                             WordPress and none of their URLs appear in
 *                             baseline.csv. Default writes them as Sanity
 *                             drafts.
 *   --acclaim-embed           the raw Issuu iframe. Default lands it in
 *                             `acclaim.embedCode`, which exists for it.
 *   --accept                  named blockers, acknowledged one at a time.
 *   --gallery-alt             how a gallery photograph's alt text is phrased.
 *
 * ## Phases
 *
 *   1. plan    always. Parse, map, resolve, assert, report. Writes nothing.
 *   2. assets  `--assets --commit`. Fetch 6,648 attachments from
 *              clearviewpublishing.com and upload them to Sanity, recording
 *              each in `.migration-source/asset-map.json`. Resumable: a failure
 *              at file 5,000 restarts at 5,000, not at zero.
 *   3. write   `--commit`. Documents, in reference order, in transactions.
 *
 * ## Usage
 *
 *   node scripts/load-to-sanity.mjs --dataset migration-dev
 *   node scripts/load-to-sanity.mjs --dataset migration-dev --plan plan.json
 *   node scripts/load-to-sanity.mjs --dataset migration-dev --assets --commit
 *   node scripts/load-to-sanity.mjs --dataset migration-dev --commit
 *
 * The sandbox dataset does not exist yet:
 *   npx sanity dataset create migration-dev
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@sanity/client'

import { blockText, convert } from './html-to-portable-text.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = `${ROOT}/.migration-source`
const ASSET_MAP_PATH = `${SOURCE_DIR}/asset-map.json`

/* -------------------------------------------------------------------------- */
/* Source field ids                                                           */
/* -------------------------------------------------------------------------- */

/**
 * ACF field keys, from `.migration-source/acf-fields-event.tsv`. Keyed on the
 * `field_<hex>` id and never on the human name: `cyph_categories` exists twice
 * on Event, once as the top-level wysiwyg (field_62d18d74eb2b1) and once as the
 * textarea nested inside the winners-video repeater (field_6348171709840).
 */
const F = {
  startDate: 'field_5540b17ca7b30',
  startTime: 'field_5540d78858d48',
  endDate: 'field_5540d60d82dd3',
  endTime: 'field_5540d7c758d49',
  timezoneCode: 'field_61b09d9e762a6',
  displayDateTime: 'field_5e85d44811324',
  programmeTaxonomy: 'field_631b482396f48',
  eventLogo: 'field_62d1891cc92b6',
  keyDates: 'field_62d18981c92b7',
  hybridOnlineEvent: 'field_62d189e7c92b8',

  agendaItineraries: 'field_67d192a39787c',
  itineraryTitle: 'field_67d1943c05b2e',
  agendaItinerary: 'field_67d192bf9787d',
  agendaTime: 'field_67d192d79787e',
  agendaItem: 'field_67d1933d97881',
  agendaTitle: 'field_67d1931e9787f',
  agendaText: 'field_67d1932b97880',

  legacyAgenda: 'field_62d19383eb2b8',
  venue: 'field_62d193a4eb2b9',
  country: 'field_62d193d6eb2ba',

  judgesIntro: 'field_62d18be063bd5',
  judgesPanels: 'field_62d18c0d63bd6',
  judgesPanelName: 'field_62d18c3c63bd7',
  judges: 'field_62d18c6263bd8',
  judgesChair: 'field_62d19c9c00dc2',

  nominationsOpening: 'field_63186c3a1c520',
  nominationsClosing: 'field_6318695f19778',
  winnersAnnouncement: 'field_6319ad78f37f2',
  categoriesContent: 'field_62d18d74eb2b1',
  awardsSupplement: 'field_62d192abeb2b2',
  awardWinnersSupplement: 'field_62d192cfeb2b3',
  connectAcclaim: 'field_6942ac347b045',
  finalists: 'field_62d19306eb2b4',
  winners: 'field_62d19318eb2b5',

  winnerVideos: 'field_634816650983b',
  winnerVideosThumb: 'field_634816890983c',
  winnerVideosRepeater: 'field_6348160d09839',
  winnerVideoVimeoId: 'field_6348162a0983a',
  winnerVideoName: 'field_634816a70983d',
  winningCategories: 'field_634816bd0983e',
  winningCategoryGroup: 'field_634816eb0983f',
  winningCategoryList: 'field_6348171709840',

  previousWinners: 'field_62d19340eb2b7',
  highlightsVideoId: 'field_64428f2481ba2',
  highlightVideoThumb: 'field_64493bef68fc4',
  hidePreviousHighlights: 'field_64674c38128d2',

  sponsorEmail: 'field_6718f8b2352e1',
  sponsorTypes: 'field_62d1991cef484',
  sponsorTypeName: 'field_62d1991cef485',
  sponsors: 'field_62d1991cef486',
  sponsorBenefits: 'field_62d199ccef487',

  sponsorVideos: 'field_63664c8436e2c',
  sponsorVideosThumb: 'field_63664c8436e2d',
  sponsorVideosRepeater: 'field_63664c8436e2e',
  sponsorVideoVimeoId: 'field_63664c8436e2f',
  sponsorVideoName: 'field_63664c8436e30',
  sponsorVideoDetails: 'field_63664c8436e31',

  registerButtonLink: 'field_67b0b55851ac0',
  tickets: 'field_62d19a11ef489',
  register: 'field_62d19a30ef48a',
  photographs: 'field_62d19a91ef48c',

  speakerTypes: 'field_62d19b0e00dbb',
  speakerTypeName: 'field_62d19b3e00dbc',
  speakers: 'field_62d19b5000dbd',
  chairs: 'field_62d19c1f00dc1',

  techDemos: 'field_62dacde7fa7b2',
  techDemoTitle: 'field_62dace45fa7b4',
  techDemoCompany: 'field_62dace1bfa7b3',
  techDemoDescription: 'field_62dace6cfa7b5',

  testimonials: 'field_62d19bdd00dc0',
  charityStatement: 'field_62d19d7b00dc5',
  charity: 'field_62d19d5100dc4',
  charityPartner: 'field_62d19d9b00dc6',
  advisoryPanel: 'field_62d19de600dc8',
  faqs: 'field_62d19e2b00dca',
  customTabs: 'field_62d19e5d00dcc',
  customTabName: 'field_62d19e7b00dcd',
  customTabContent: 'field_62d19e8a00dce',

  // acclaim, from fields-acclaim.tsv
  acclaimThumb: 'field_693bee549278c',
  acclaimIssuuId: 'field_693c0ceb5c82c',
  acclaimEmbedCode: 'field_693aae5141adc',

  // resource, from fields-resource.tsv
  partnerCategory: 'field_669a6553438c2',
  partnerCategoryTitle: 'field_669a659a438c3',
  partnerCompanies: 'field_669a64a554a54',
  downloadThumbnail: 'field_669a8b0899235',
  downloadUrl: 'field_669a88a099234',
  makeAuthorCompany: 'field_6915a26be2413',
  participantsAuthors: 'field_66912a574be6a',
  authorCompany: 'field_6915a28ae2414',
  runningTime: 'field_669a56528ed2d',
}

/**
 * `events-category` term ids. The split is by term and not by which fields
 * happen to be filled: 56 awards-tagged records from 2022 and earlier carry
 * only a title, body and logo, and a field-occupancy rule would file them as
 * conference events, where `eventType` has no honest value and the record
 * would surface on the wrong `/events-category/` listing.
 * MIGRATION-CONTEXT section 5.
 */
const TERM_AWARDS = '6'
const TERM_SUMMITS = '8'
const TERM_BRIEFINGS = '21'
const TERM_WEBINAR = '9'

/**
 * The three records whose `events-category` terms do not resolve on their own.
 * Named here rather than handled by a rule, because each is a one-off and a
 * rule would hide the next one.
 */
const EVENT_OVERRIDES = {
  20663: {
    type: 'awardsProgramme',
    reason:
      'terms 6,21 (awards + briefings). Briefings has no record of its own; the awards term wins and the record is the Tenth Annual WealthBriefingAsia Awards 2022.',
  },
  45031: {
    type: 'conferenceEvent',
    eventType: 'webinar',
    reason:
      'terms 9,8 (webinar + summits). Title begins "Webinar:" and the record carries speaker types, so webinar wins over summit.',
  },
  2877: {
    type: 'conferenceEvent',
    eventType: 'summit',
    provisional: true,
    reason:
      'no events-category term at all, the only one of 255. Swiss Finance Institute International Wealth Management Retreat, September 2013. Loaded as a summit provisionally; the question is with Theodora Viney, MIGRATION-CONTEXT section 7a. Reversible with one field.',
  },
}

/**
 * Every non-empty source value that has no address in the schema, with the
 * reason it has none. A field not in the schema and not in this list is a
 * BLOCKER: the run reports it and refuses to write.
 *
 * `leaf` is the value that `leafOf()` returns for the flat key. `only` narrows
 * the entry to named record ids, so a blanket exemption cannot be smuggled in
 * as a one-record fix.
 */
const IGNORED = [
  {
    leaf: F.legacyAgenda,
    types: ['events'],
    only: ['45069'],
    reason:
      'The Fourth Miami Family Wealth Report Awards 2027. The only one of 255 records carrying both awards fields and cyph_agenda. Verified not to be an agenda: 16 of its 18 sentences appear verbatim in the record\'s own `content`, the other two are paraphrases. Merging it into `body` would print the introduction twice on the page. MIGRATION-CONTEXT section 7.',
  },
  {
    leaf: 'pods_meta_people',
    types: ['companies'],
    reason:
      'Mirror of person.companies. Pods stores the company <-> person relation bidirectionally in wp_podsrel and both screens were scraped; the loader asserts at run time that no pair exists on the company side alone (measured: 1,548 company-side pairs, 1,549 person-side, 0 company-only). Storing it twice would mean two lists kept in sync by hand. company.ts docblock.',
  },
  {
    leaf: 'pods_meta_email',
    types: ['people'],
    reason:
      'Present on 10 of 1,558 people. Deliberately not modelled: the site reads published documents anonymously so they stay CDN-cacheable, which would publish judges\' and speakers\' addresses. person.ts docblock.',
  },
  {
    leaf: 'tax:company_category',
    types: ['companies'],
    blocker: 'taxonomy-ids',
    reason:
      'company_category term ids with no labels. wp-extract.js captures tax_input ids only, and the WordPress term names were never dumped, so the only available value is a number that means nothing in a tag field. Non-default terms sit on 356 of 1,451 companies. Re-extract the term names before cutover, or accept `--accept=taxonomy-ids` to store them as `wp-term-<id>` for later renaming.',
  },
  {
    leaf: 'tax:people_category',
    types: ['people'],
    blocker: 'taxonomy-ids',
    reason:
      'people_category term ids with no labels, same cause as company_category. Non-default terms sit on 446 of 1,558 people.',
  },
  {
    leaf: 'tax:acclaim---awards-programme',
    types: ['acclaim'],
    reason:
      'A different taxonomy from `awards_event_programme`, with its own term ids (62,63,64,66,67,68,69) and no labels in the dump, so it cannot be resolved to an awardsProgrammeGroup. acclaim.programme is derived instead from the event that links to the acclaim through cyph_connect_acclaim, which reaches 7 of 8 records. The 8th, 46385, is linked from two events on two different programmes and is the one record whose own taxonomy field is empty.',
  },
  {
    leaf: F.acclaimEmbedCode,
    types: ['acclaim'],
    when: (options) => options.acclaimEmbed === 'drop',
    reason:
      'The raw Issuu <iframe>. Dropped only under --acclaim-embed=drop, on the argument that it is an embed and not prose and that acclaim.issuuId already holds the 32-character document hash. The default is to keep it: acclaim.embedCode exists in the schema for exactly this value ("Raw iframe as published by Issuu"), and dropping it leaves that field dead on all 8 records.',
  },
]

/** Record-level keys that are not content and have no schema address. */
const IGNORED_RECORD_KEYS = {
  postType: 'Dump partitioning, not content. The Sanity _type carries it.',
  editUrl: 'wp-admin address, derivable from legacyWpId. Not content.',
  parent: 'null on every record of every type in the dump.',
  published:
    'WordPress post date. On an event the editorial date is startDate, and none of the eight types has a separate publish timestamp; Sanity _createdAt records the import instead.',
  status:
    'WordPress post status. Drives whether the document is written published or as a Sanity draft (see --unpublished), so it is consumed as behaviour rather than stored as a field.',
  thumbnailId:
    'Featured image. "-1" on every event and on 7 of 8 acclaim records; the 8th (45100) repeats the attachment already held in acc_thumbnail_image, so nothing is lost.',
  id: 'Consumed as legacyWpId and as the document _id.',
  title: 'Consumed as `title`.',
  slug: 'Consumed as `slug`.',
  content: 'Consumed as the record body where the type has one.',
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const hash10 = (value) => createHash('sha1').update(value).digest('hex').slice(0, 10)

/**
 * Emptiness, spelled out because three of the five rules are source-specific
 * and a generic falsiness test gets them wrong.
 *
 *   - `["0"]` is WordPress's tax_input sentinel for "no term selected"
 *   - `"0"` on an ACF true_false is the unset default (251 of 255 on
 *     disable_display_previous_years_highlight_video, 12 of 12 on
 *     make_author_company). The 4 records reading "1" are real data.
 *   - `{value:"AF"}` is the first option of the legacy country select and sits
 *     on 179 of 255 records as an unset default, not as data. fields.ts.
 */
function isEmpty(value, { boolean: isBoolean = false } = {}) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return !value.trim() || (isBoolean && value.trim() === '0')
  if (Array.isArray(value)) return value.filter((item) => item !== '0').length === 0
  if (typeof value === 'object') {
    if ('value' in value) return value.value === null || value.value === '' || value.value === 'AF'
    return Object.keys(value).length === 0
  }
  return false
}

/** Flatten an ACF post_object value to the ids it points at. */
function refIds(value) {
  const out = []
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object' && 'value' in node) out.push(String(node.value))
  }
  walk(value)
  return out
}

/**
 * The leaf identity of a flat dump key. Consumption is tracked on this rather
 * than on the whole key, so declaring that a repeater container is handled does
 * not also silently declare that every child inside it is.
 */
function leafOf(key) {
  const ids = key.match(/field_[0-9a-f]+/g)
  if (ids) return ids[ids.length - 1]
  const tax = /^tax_input\[([^\]]+)\]/.exec(key)
  if (tax) return `tax:${tax[1]}`
  return key
}

/** `20261001` -> `2026-10-01`. ACF stores Ymd and renders d/m/Y; only the stored value is parsed. */
function acfDate(value, problems, where) {
  if (isEmpty(value)) return undefined
  const raw = String(value).trim()
  if (!/^\d{8}$/.test(raw)) {
    problems.push(`${where}: date is not Ymd: ${JSON.stringify(raw)}`)
    return undefined
  }
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  if (Number.isNaN(Date.parse(iso))) {
    problems.push(`${where}: date does not exist: ${iso}`)
    return undefined
  }
  return iso
}

/**
 * Event start/end times, in the three shapes 20 years of ACF left behind.
 * Measured over the 383 non-empty start/end values on the 255 records:
 *
 *   234  Unix epoch seconds   "1525766400"            the old ACF date_time_picker
 *   107  `Y-m-d H:i:s`        "2022-11-23 18:30:00"   a datetime in a time field
 *    42  `H:i:s`              "14:00:00"              what the current field stores
 *
 * Only the clock survives, never the date. Both dated shapes disagree with the
 * record's own start date far too often to be trusted as a date: the datetime's
 * day differs from startDate on 31 of 53 records, and the epoch's UTC day on
 * 116 of 117. The clock itself holds up three ways - the epochs land on event
 * hours (08:00 x52, 11:00 x47, 08:15 x31), every start/end pair is 2.5 to 6
 * hours apart, and on the 6 records that also spell the time out in their body
 * text the UTC clock matches all 6.
 *
 * A naive HH:mm regex silently discards 341 of the 383 values, which is the
 * whole reason this reads three shapes and reports anything it cannot.
 */
function acfTime(value, problems, where) {
  if (isEmpty(value)) return undefined
  const raw = String(value).trim()

  const clock = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(raw)
  if (clock) return `${clock[1].padStart(2, '0')}:${clock[2]}`

  const datetime = /^\d{4}-\d{2}-\d{2}[ T]([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(raw)
  if (datetime) return `${datetime[1]}:${datetime[2]}`

  if (/^\d{9,11}$/.test(raw)) {
    const at = new Date(Number(raw) * 1000)
    if (!Number.isNaN(at.getTime())) return at.toISOString().slice(11, 16)
  }

  problems.push(`${where}: time is in none of the three known shapes: ${JSON.stringify(raw)}`)
  return undefined
}

const VIMEO_ID = /^\d+$/

function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
    .replace(/-+$/g, '')
}

/** Matching key for a company or category name. Case, entities and quote glyphs only. */
function normName(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .normalize('NFKC')
    .replace(/[‘’ʼ´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const puncName = (text) =>
  normName(text)
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Legal-form suffixes only. Deliberately not "group", "holdings",
 * "international" or "the": stripping those matched 16 more winner names but
 * each match was a guess, and a wrong match files an award under the wrong
 * company - exactly the silent-success failure README describes for redirects.
 */
const LEGAL_SUFFIX = /\b(ltd|limited|llc|inc|incorporated|plc|ag|sa|nv|llp|gmbh|pte|co|corp|corporation)\b/g

const coreName = (text) =>
  puncName(text)
    .replace(LEGAL_SUFFIX, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function pick(object) {
  const out = {}
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out
}

const reference = (id) => ({ _type: 'reference', _ref: id })

const keyed = (items, prefix) =>
  items.map((item, index) => ({ _key: `${prefix}${index}`, ...item }))

/* -------------------------------------------------------------------------- */
/* Prose                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The only host whose images are in the WordPress media library, and therefore
 * the only host the asset phase fetches from.
 *
 * The other four carry 49 of the 116 inline images: wb001.profundcom.net 14,
 * clearviewevents.profundcom.net 33, storage.mlcdn.com 1,
 * cdn.uploads.webconnex.com 1. None is in the library, none is reachable
 * through /wp-json/wp/v2/media/, and all are http://, so a browser blocks them
 * as mixed content on the HTTPS site whether or not the host is still alive.
 * MIGRATION-CONTEXT section 7 item 5; the decision is Theodora's, the switch is
 * `--inline-foreign-images=keep`.
 */
const LIBRARY_HOST = 'clearviewpublishing.com'

/**
 * Convert one wysiwyg blob and hand back Portable Text plus the inline images
 * it found. Images arrive from the converter as `{_type:'image', wpImage:{...}}`
 * with no `asset`, and an image with no asset renders as nothing, so every one
 * of them is either resolved to an asset here or removed and counted.
 */
function prose(html, context, plan) {
  if (isEmpty(html)) return undefined
  const { blocks, notes } = convert(html)
  const out = []

  // The converter removes what richText has no member for and reports it
  // rather than dropping it silently. Those reports stop at the converter, so
  // they are carried up here: 37 iframes and 50 tables across the corpus are
  // content that will not be on the migrated page.
  for (const iframe of notes.iframes) {
    plan.removed.push(`${context.where}: <iframe> removed, no richText member for it — ${String(iframe.src || iframe).slice(0, 80)}`)
  }
  for (const table of notes.tables) {
    plan.removed.push(`${context.where}: <table> removed, no richText member for it — ${String(table.summary || table.rows || '').slice(0, 60)}`)
  }
  for (const dropped of notes.links.dropped) {
    plan.removed.push(`${context.where}: link scheme ${dropped.scheme} outside the allowlist, annotation dropped and text kept — ${dropped.href}`)
  }

  // A wysiwyg field that converts to nothing is the silent failure this whole
  // file exists to prevent, so the plain text is measured on both sides.
  const before = String(html).replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim().length
  const after = blockText(blocks).replace(/\s+/g, ' ').trim().length
  if (before > 40 && after < before / 2) {
    plan.problems.push(`${context.where}: ${before} characters of source text converted to ${after}, which is less than half`)
  }

  for (const block of blocks) {
    if (block._type !== 'image' || !block.wpImage) {
      out.push(block)
      continue
    }

    const { attachmentId, src, host, linkHref } = block.wpImage
    const record = { ...context, attachmentId, src, host, linkHref }

    // One `<img>` in the corpus (event 32246, cyph_awardwinners_supplement) has
    // a broken tag whose src parsed as `<a href=`, and its attachment id is not
    // in wp-media.json either. Nothing can resolve it, so it is its own bucket
    // rather than being filed under a host it does not have.
    const validSrc = typeof src === 'string' && /^https?:\/\//.test(src)

    if (!validSrc && !plan.media[attachmentId]) {
      plan.inlineImages.unresolvable.push(record)
      plan.blockers.push({
        code: 'inline-image-unresolvable',
        message: `${context.where}: inline image has attachment id ${attachmentId} (absent from wp-media.json) and an unusable src ${JSON.stringify(String(src).slice(0, 40))}. The <img> tag is malformed in the source.`,
      })
      continue
    }

    if (host !== LIBRARY_HOST) {
      plan.inlineImages.foreign.push(record)
      if (plan.options.inlineForeignImages === 'drop') continue
    }

    // wp-media.json resolves 2 of the 56 distinct inline ids. The manifest was
    // built before the converter emitted its inline list, so the other 54 were
    // never requested. Their `src` is a real library URL, so it is used
    // directly; the attachment id still keys the asset map, so re-running does
    // not upload twice.
    const media = attachmentId ? plan.media[attachmentId] : undefined
    const url = media?.url || src

    plan.inlineImages.resolved.push(record)
    const assetKey = attachmentId || `url-${hash10(url)}`
    plan.assetsWanted.set(assetKey, {
      key: assetKey,
      kind: 'image',
      url,
      filename: media?.filename || url.split('/').pop() || `${assetKey}.jpg`,
      mimeType: media?.mimeType || 'image/jpeg',
      origin: 'inline',
    })

    out.push(
      pick({
        _type: 'image',
        _key: block._key,
        alt: block.alt || context.fallbackAlt,
        asset: plan.assetRef(assetKey),
        _wpAssetKey: assetKey,
      }),
    )
  }

  return out.length ? out : undefined
}

/* -------------------------------------------------------------------------- */
/* Alt text                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Alternative text for a migrated image.
 *
 * WordPress carries real alt on 27 of 6,648 attachments. `title` exists on
 * 6,647 but is the filename in almost every case (`tburroughes90x90`, `choare`,
 * `S_PMM300wide-1`), so it is not alt text and is not used as one.
 *
 * The schema makes alt required as soon as an asset is attached, and a
 * validation error blocks publishing in Studio, so a migrated document must not
 * arrive with an empty one. 2,225 of the 6,648 are derivable from the parent
 * record. The 4,423 gallery photographs are not: nothing in the source says who
 * or what is in the frame.
 *
 * The gallery phrasing is English, not the Russian placeholder the brief
 * sketched, because the alt text is read by screen-reader users on an
 * English-language site. It is one function on purpose: replace it the day
 * anything better exists, for example a vision pass over the files.
 */
function deriveAlt(role, context, options) {
  const real = context.wpAlt && String(context.wpAlt).trim()
  if (real) return real

  const parent = (context.parentTitle || '').trim()
  switch (role) {
    case 'personPhoto':
      return parent || undefined
    case 'companyLogo':
      return parent ? `${parent} logo` : undefined
    case 'eventLogo':
    case 'acclaimThumbnail':
    case 'resourceDownloadThumbnail':
      return parent || undefined
    case 'highlightVideoThumbnail':
      return parent ? `${parent} — highlights video` : undefined
    case 'sponsorVideosThumbnail':
      return parent ? `${parent} — sponsor videos` : undefined
    case 'winnerVideosThumbnail':
      return parent ? `${parent} — winner videos` : undefined
    case 'photographsGallery':
      return options.galleryAlt === 'bare'
        ? parent || undefined
        : parent
          ? `${parent} — photograph ${context.position} of ${context.total}`
          : undefined
    default:
      return parent || undefined
  }
}

/* -------------------------------------------------------------------------- */
/* Plan                                                                       */
/* -------------------------------------------------------------------------- */

function readJson(path) {
  if (!existsSync(path)) throw new Error(`missing input: ${path}`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

function newPlan(options) {
  const assetMap = loadAssetMap(options)
  return {
    options,
    documents: [],
    byType: new Map(),
    assetsWanted: new Map(),
    assetMap,
    media: {},
    problems: [],
    blockers: [],
    notes: [],
    ignored: new Map(),
    consumed: new Map(),
    inlineImages: { resolved: [], foreign: [], unresolvable: [] },
    removed: [],
    altSources: new Map(),
    stats: {},
    references: { requested: 0, resolved: 0, failed: [] },
    /**
     * In a dry run the asset map is usually empty, so every image would carry
     * no asset and the shape checks that matter most - no surviving wpImage, no
     * attached image without alt - would never run. A dry run therefore stands
     * in a synthetic reference, so the plan is asserted in the shape it would
     * actually be written in. A commit never simulates: there the missing
     * reference is the gate that stops documents being written before their
     * assets exist.
     */
    assetRef(key, kind = 'image') {
      const entry = assetMap.assets[key]
      if (entry) return { _type: 'reference', _ref: entry._id }
      if (!options.commit) return { _type: 'reference', _ref: `${kind}-simulated${key}` }
      return undefined
    },
  }
}

function addDocument(plan, document) {
  plan.documents.push(document)
  const list = plan.byType.get(document._type) || []
  list.push(document)
  plan.byType.set(document._type, list)
  return document
}

/**
 * Attach one image field. Registers the attachment for the asset phase,
 * resolves the reference if the asset map already holds it, and derives alt.
 */
function image(plan, attachmentId, role, context) {
  if (!attachmentId || attachmentId === '-1') return undefined
  const media = plan.media[attachmentId]
  if (!media) {
    plan.blockers.push({
      code: 'attachment-missing',
      message: `${context.where}: attachment ${attachmentId} (${role}) is not in wp-media.json`,
    })
    return undefined
  }

  if (media.mimeType && !media.mimeType.startsWith('image/')) {
    plan.problems.push(
      `${context.where}: attachment ${attachmentId} (${role}) is ${media.mimeType}, not an image — ${media.filename}`,
    )
    return undefined
  }

  plan.assetsWanted.set(attachmentId, {
    key: attachmentId,
    kind: 'image',
    url: media.url,
    filename: media.filename,
    mimeType: media.mimeType,
    origin: 'field',
  })

  const alt = deriveAlt(role, { ...context, wpAlt: media.altText }, plan.options)
  const kind = media.altText && String(media.altText).trim() ? 'WordPress alt' : alt ? `derived from ${role}` : 'NONE'
  plan.altSources.set(kind, (plan.altSources.get(kind) || 0) + 1)
  if (!alt) {
    plan.problems.push(`${context.where}: no alt could be derived for attachment ${attachmentId} (${role})`)
  }

  return pick({ _type: 'image', alt, asset: plan.assetRef(attachmentId), _wpAssetKey: attachmentId })
}

/**
 * Attach one non-image attachment as a `file`.
 *
 * WordPress keeps a single ACF image field, `download_thumbnail`, for two kinds
 * of attachment: 6 of the 12 resources point at a cover image and the other 6
 * at the report PDF itself. Sanity refuses a PDF as an image asset, so the
 * routing is by MIME type from wp-media.json - `image/*` goes to the image
 * field through `image()` above, everything else lands here and in
 * `resource.downloadFile`, which exists for it.
 */
function fileAttachment(plan, attachmentId, role, context) {
  if (!attachmentId || attachmentId === '-1') return undefined
  const media = plan.media[attachmentId]
  if (!media) {
    plan.blockers.push({
      code: 'attachment-missing',
      message: `${context.where}: attachment ${attachmentId} (${role}) is not in wp-media.json`,
    })
    return undefined
  }

  plan.assetsWanted.set(attachmentId, {
    key: attachmentId,
    kind: 'file',
    url: media.url,
    filename: media.filename,
    mimeType: media.mimeType,
    origin: 'field',
  })

  return pick({ _type: 'file', asset: plan.assetRef(attachmentId, 'file'), _wpAssetKey: attachmentId })
}

/* -------------------------------------------------------------------------- */
/* Consumption tracking                                                       */
/* -------------------------------------------------------------------------- */

function consume(seen, ...leaves) {
  for (const leaf of leaves) if (leaf) seen.add(leaf)
}

/**
 * Diff the field map against the dump. Every non-empty flat key whose leaf was
 * not consumed and is not in IGNORED becomes a blocker naming the record.
 */
function auditRecord(plan, type, record, seen) {
  const booleanLeaves = new Set([F.hidePreviousHighlights, F.makeAuthorCompany])

  for (const [key, value] of Object.entries(record.fields || {})) {
    const leaf = leafOf(key)
    if (isEmpty(value, { boolean: booleanLeaves.has(leaf) })) continue
    if (seen.has(leaf)) continue

    const entry = IGNORED.find(
      (candidate) =>
        candidate.leaf === leaf &&
        (!candidate.types || candidate.types.includes(type)) &&
        (!candidate.only || candidate.only.includes(String(record.id))) &&
        (!candidate.when || candidate.when(plan.options)),
    )

    if (entry) {
      const bucket = plan.ignored.get(entry) || []
      bucket.push(`${type} ${record.id} ${key}`)
      plan.ignored.set(entry, bucket)
      // One blocker per code, not per record: the reason is the same sentence
      // 747 times over and a wall of it hides the other two codes.
      if (entry.blocker) {
        const already = plan.blockers.find((blocker) => blocker.code === entry.blocker && blocker.leaf === leaf)
        if (already) already.count += 1
        else plan.blockers.push({ code: entry.blocker, leaf, count: 1, entry })
      }
      continue
    }

    plan.blockers.push({
      code: 'field-with-nowhere-to-go',
      message: `${type} ${record.id}: ${key} carries ${JSON.stringify(String(JSON.stringify(value)).slice(0, 80))} and has no address in the schema and no entry in IGNORED`,
    })
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === 'fields') continue
    if (isEmpty(value)) continue
    if (seen.has(`rec:${key}`)) continue
    if (IGNORED_RECORD_KEYS[key]) continue
    plan.blockers.push({
      code: 'record-key-with-nowhere-to-go',
      message: `${type} ${record.id}: record key "${key}" has no address in the schema and no entry in IGNORED_RECORD_KEYS`,
    })
  }
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The 13 `awards_event_programme` terms that actually carry events. The
 * taxonomy is said elsewhere to hold 16 terms and to mix evergreen programmes
 * with year-specific siblings; the dump confirms 13 and no more, so 13 is what
 * is written. Term ids and labels both come from the ACF taxonomy field, which
 * is the only place in the dump carrying a label for them.
 */
function buildProgrammeGroups(plan, events) {
  const terms = new Map()

  for (const record of events) {
    const field = record.fields[`acf[${F.programmeTaxonomy}]`]
    const tax = (record.fields['tax_input[event_programme]'] || []).filter((id) => id !== '0')

    if (field && field.value) terms.set(String(field.value), String(field.label || '').trim())
    for (const id of tax) {
      if (!terms.has(id)) terms.set(id, '')
    }
  }

  for (const [id, label] of terms) {
    if (!label) {
      plan.blockers.push({
        code: 'programme-term-without-label',
        message: `awards_event_programme term ${id} is on a record's tax_input but the ACF taxonomy field never carried its label, so the programme cannot be named`,
      })
      continue
    }
    addDocument(plan, {
      _id: `programme-wp-term-${id}`,
      _type: 'awardsProgrammeGroup',
      title: label,
      slug: { _type: 'slug', current: slugify(label) },
      legacyTermId: Number(id),
    })
  }

  plan.stats.programmeTerms = terms.size
  return new Map([...terms.keys()].map((id) => [id, `programme-wp-term-${id}`]))
}

function buildCompanies(plan, records) {
  const ids = new Map()

  for (const record of records) {
    const seen = new Set(['rec:id', 'rec:title', 'rec:slug', 'rec:status'])
    const where = `company ${record.id}`
    const id = `company-wp-${record.id}`

    let title = (record.title || '').trim()
    let derivedFrom
    if (!title) {
      // 3 of 1,451 companies have an empty post_title and all three are
      // referenced, so they cannot be skipped. The logo attachment's own title
      // names two of them; the third has only a website.
      const logo = refIds(record.fields?.pods_meta_logo)[0]
      const logoTitle = logo && plan.media[logo] ? String(plan.media[logo].title || '').trim() : ''
      if (logoTitle) {
        title = logoTitle.replace(/\s+logo$/i, '').trim()
        derivedFrom = `logo attachment ${logo} title`
      } else if (record.fields?.pods_meta_website_url) {
        title = String(record.fields.pods_meta_website_url)
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/.*$/, '')
        derivedFrom = 'website hostname'
      }
      if (!title) {
        plan.blockers.push({
          code: 'company-without-title',
          message: `${where}: no post_title and nothing to derive one from; company.title is required`,
        })
        continue
      }
      plan.notes.push(`${where}: post_title empty, title derived from ${derivedFrom} -> ${JSON.stringify(title)}`)
    }

    consume(seen, 'pods_meta_website_url', 'pods_meta_company_address', 'pods_meta_google_map_location', 'pods_meta_phone_number', 'pods_meta_comp_about', 'pods_meta_logo')

    const logoId = refIds(record.fields?.pods_meta_logo)[0]
    const document = pick({
      _id: id,
      _type: 'company',
      title,
      slug: { _type: 'slug', current: slugify(record.slug || title) || `company-${record.id}` },
      logo: logoId ? image(plan, logoId, 'companyLogo', { where, parentTitle: title }) : undefined,
      websiteUrl: cleanUrl(plan, record.fields?.pods_meta_website_url, `${where} websiteUrl`),
      about: prose(record.fields?.pods_meta_comp_about, { where: `${where} about`, fallbackAlt: title }, plan),
      address: textOf(record.fields?.pods_meta_company_address),
      googleMapLocation: textOf(record.fields?.pods_meta_google_map_location),
      phoneNumber: textOf(record.fields?.pods_meta_phone_number),
      categories: taxonomyTags(plan, record.fields?.['tax_input[company_category]']),
      legacyWpId: Number(record.id),
    })

    if (plan.options.accept.has('taxonomy-ids')) consume(seen, 'tax:company_category')
    auditRecord(plan, 'companies', record, seen)
    addDocument(plan, document)
    ids.set(String(record.id), id)
  }

  return ids
}

function buildPeople(plan, records, companyIds) {
  const ids = new Map()

  for (const record of records) {
    const seen = new Set(['rec:id', 'rec:title', 'rec:slug', 'rec:status', 'rec:content'])
    const where = `person ${record.id}`
    const first = textOf(record.fields?.pods_meta_first_name)
    const last = textOf(record.fields?.pods_meta_last_name)

    let title = (record.title || '').trim()
    if (!title) {
      title = [first, last].filter(Boolean).join(' ').trim()
      if (!title) {
        plan.blockers.push({
          code: 'person-without-title',
          message: `${where}: no post_title and no first/last name; person.title is required`,
        })
        continue
      }
      plan.notes.push(`${where}: post_title empty, title derived from first/last name -> ${JSON.stringify(title)}`)
    }

    consume(seen, 'pods_meta_first_name', 'pods_meta_last_name', 'pods_meta_job_title', 'pods_meta_company', 'pods_meta_photo')

    const photoId = refIds(record.fields?.pods_meta_photo)[0]
    const document = pick({
      _id: `person-wp-${record.id}`,
      _type: 'person',
      title,
      firstName: first,
      lastName: last,
      slug: { _type: 'slug', current: slugify(record.slug || title) || `person-${record.id}` },
      jobTitle: textOf(record.fields?.pods_meta_job_title),
      companies: resolveRefs(plan, record.fields?.pods_meta_company, companyIds, `${where} companies`),
      photo: photoId ? image(plan, photoId, 'personPhoto', { where, parentTitle: title }) : undefined,
      bio: prose(record.content, { where: `${where} bio`, fallbackAlt: title }, plan),
      categories: taxonomyTags(plan, record.fields?.['tax_input[people_category]']),
      legacyWpId: Number(record.id),
    })

    if (plan.options.accept.has('taxonomy-ids')) consume(seen, 'tax:people_category')
    auditRecord(plan, 'people', record, seen)
    addDocument(plan, document)
    ids.set(String(record.id), `person-wp-${record.id}`)
  }

  return ids
}

/**
 * One AwardCategory document per distinct category name, matched
 * case-insensitively: 1,267 raw strings collapse to 1,168.
 *
 * Global, not scoped to a programme. Scoping would turn 1,168 documents into
 * 1,619 programme-plus-category pairs for nothing, and the same category name
 * recurs across programmes and years. award-category.ts.
 *
 * The _id is a hash of the normalised name rather than the slug, because 47
 * slugs collide (punctuation and case differences that slugify identically) and
 * a positional suffix would renumber the moment the corpus is re-exported
 * before cutover.
 */
function buildAwardCategories(plan, winners) {
  const categories = new Map()

  for (const pair of winners) {
    const raw = String(pair.category || '').trim()
    if (!raw) continue
    const key = normName(raw)
    const entry = categories.get(key) || { title: raw, groups: new Map(), count: 0 }
    entry.count += 1
    if (pair.group) entry.groups.set(pair.group, (entry.groups.get(pair.group) || 0) + 1)
    categories.set(key, entry)
  }

  const slugCounts = new Map()
  for (const [key, entry] of categories) {
    const base = slugify(entry.title)
    entry.baseSlug = base
    if (base) slugCounts.set(base, (slugCounts.get(base) || 0) + 1)
    else {
      plan.problems.push(
        `award category ${JSON.stringify(entry.title)} slugifies to nothing (${entry.count} winner rows); it is a parse artefact from cyph_winners`,
      )
    }
    entry.key = key
  }

  const ids = new Map()
  for (const [key, entry] of categories) {
    const id = `award-category-${hash10(key)}`
    const collides = entry.baseSlug && slugCounts.get(entry.baseSlug) > 1
    const slug = entry.baseSlug
      ? collides
        ? `${entry.baseSlug}-${hash10(key).slice(0, 6)}`
        : entry.baseSlug
      : `category-${hash10(key)}`

    const group = [...entry.groups.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    addDocument(plan, {
      _id: id,
      _type: 'awardCategory',
      title: entry.title,
      slug: { _type: 'slug', current: slug },
      ...(group ? { categoryGroup: group } : {}),
    })
    ids.set(key, id)
  }

  plan.stats.awardCategorySlugCollisions = [...slugCounts.values()].filter((n) => n > 1).length
  return ids
}

/**
 * Winner names that match no Company record become Company documents carrying
 * only a title. Deliberate, not a defect: Deliverables section 9 says the
 * publisher's team populates the remaining profiles. company.ts.
 *
 * Matching is three exact passes and nothing fuzzy - normalised name,
 * punctuation-stripped name, legal-suffix-stripped name - and the last two are
 * skipped whenever the key is not unique on the company side, so an ambiguous
 * name creates a new record rather than guessing at an old one.
 */
function buildWinnerCompanies(plan, winners, sourceCompanies, companyIds) {
  const tiers = [new Map(), new Map(), new Map()]
  const ambiguous = [new Set(), new Set(), new Set()]

  for (const record of sourceCompanies) {
    const title = (record.title || '').trim()
    if (!title) continue
    const keys = [normName(title), puncName(title), coreName(title)]
    keys.forEach((key, tier) => {
      if (!key) return
      const held = tiers[tier].get(key)
      if (held && held !== record.id) ambiguous[tier].add(key)
      else tiers[tier].set(key, record.id)
    })
  }

  const resolved = new Map()
  const created = new Map()
  const tally = { exact: 0, punctuation: 0, legalSuffix: 0, created: 0 }

  for (const pair of winners) {
    const raw = String(pair.winner || '').trim()
    if (!raw) continue
    const key = normName(raw)
    if (resolved.has(key) || created.has(key)) continue

    const keys = [key, puncName(raw), coreName(raw)]
    let sourceId
    let tier = -1
    for (let index = 0; index < 3; index += 1) {
      const candidate = keys[index]
      if (!candidate) continue
      if (index > 0 && ambiguous[index].has(candidate)) continue
      if (tiers[index].has(candidate)) {
        sourceId = tiers[index].get(candidate)
        tier = index
        break
      }
    }

    if (sourceId && companyIds.has(String(sourceId))) {
      resolved.set(key, companyIds.get(String(sourceId)))
      tally[['exact', 'punctuation', 'legalSuffix'][tier]] += 1
      continue
    }

    const id = `company-winner-${hash10(key)}`
    addDocument(plan, {
      _id: id,
      _type: 'company',
      title: raw,
      slug: { _type: 'slug', current: slugify(raw) || `winner-${hash10(key)}` },
    })
    created.set(key, id)
    tally.created += 1
  }

  plan.stats.winnerMatching = tally
  return { resolved, created }
}

function buildAcclaim(plan, records, acclaimProgramme) {
  const ids = new Map()

  for (const record of records) {
    const seen = new Set(['rec:id', 'rec:title', 'rec:slug', 'rec:status'])
    const where = `acclaim ${record.id}`
    const title = (record.title || '').trim()

    consume(seen, F.acclaimThumb, F.acclaimIssuuId)
    if (plan.options.acclaimEmbed === 'keep') consume(seen, F.acclaimEmbedCode)

    const thumbId = textOf(record.fields?.[`acf[${F.acclaimThumb}]`])
    const issuuId = textOf(record.fields?.[`acf[${F.acclaimIssuuId}]`])
    if (issuuId && !/^[0-9a-f]{32}$/.test(issuuId)) {
      plan.problems.push(`${where}: issuuId ${JSON.stringify(issuuId)} does not match the 32-hex schema rule`)
    }

    const programmeId = acclaimProgramme.get(String(record.id))
    addDocument(
      plan,
      pick({
        _id: `acclaim-wp-${record.id}`,
        _type: 'acclaim',
        title,
        slug: { _type: 'slug', current: record.slug || slugify(title) },
        programme: programmeId ? reference(programmeId) : undefined,
        thumbnailImage: thumbId ? image(plan, thumbId, 'acclaimThumbnail', { where, parentTitle: title }) : undefined,
        issuuId: issuuId || undefined,
        embedCode:
          plan.options.acclaimEmbed === 'keep'
            ? textOf(record.fields?.[`acf[${F.acclaimEmbedCode}]`])
            : undefined,
        legacyWpId: Number(record.id),
      }),
    )

    auditRecord(plan, 'acclaim', record, seen)
    ids.set(String(record.id), `acclaim-wp-${record.id}`)
  }

  return ids
}

function buildResources(plan, records, companyIds, personIds) {
  for (const record of records) {
    const seen = new Set(['rec:id', 'rec:title', 'rec:slug', 'rec:status', 'rec:content'])
    const where = `resource ${record.id}`
    const title = (record.title || '').trim()

    consume(
      seen,
      F.partnerCategory,
      F.partnerCategoryTitle,
      F.partnerCompanies,
      F.downloadUrl,
      F.participantsAuthors,
      F.makeAuthorCompany,
      F.authorCompany,
      F.runningTime,
    )

    const thumbId = textOf(record.fields?.[`acf[${F.downloadThumbnail}]`])
    const thumbMedia = thumbId ? plan.media[thumbId] : undefined
    const thumbIsImage = thumbMedia && String(thumbMedia.mimeType || '').startsWith('image/')
    // Routed by MIME type: an image is a cover thumbnail, anything else is the
    // report itself and goes to `downloadFile`. Both addresses exist in the
    // schema, so the field is consumed either way.
    if (thumbMedia) consume(seen, F.downloadThumbnail)

    const partners = repeaterRows(record, F.partnerCategory)
      .map((row, index) => {
        const name = textOf(row[F.partnerCategoryTitle])
        const companies = resolveRefs(plan, row[F.partnerCompanies], companyIds, `${where} partners[${index}]`)
        if (!name || !companies.length) return undefined
        return { _type: 'companyGroup', name, companies }
      })
      .filter(Boolean)

    addDocument(
      plan,
      pick({
        _id: `resource-wp-${record.id}`,
        _type: 'resource',
        title,
        slug: { _type: 'slug', current: record.slug || slugify(title) },
        // `resource-categories` never reached the dump - the taxonomy is absent
        // from all 12 records - so `category` is left unset rather than guessed
        // at from the /resource-categories/research/ listing.
        body: prose(record.content, { where: `${where} body`, fallbackAlt: title }, plan),
        downloadThumbnail: thumbIsImage
          ? image(plan, thumbId, 'resourceDownloadThumbnail', { where, parentTitle: title })
          : undefined,
        downloadFile:
          thumbMedia && !thumbIsImage
            ? fileAttachment(plan, thumbId, 'resourceDownloadFile', { where, parentTitle: title })
            : undefined,
        downloadUrl: cleanUrl(plan, record.fields?.[`acf[${F.downloadUrl}]`], `${where} downloadUrl`),
        authors: resolveRefs(plan, record.fields?.[`acf[${F.participantsAuthors}]`], personIds, `${where} authors`),
        partnerCategories: keyed(partners, 'p'),
        legacyWpId: Number(record.id),
      }),
    )

    auditRecord(plan, 'resource', record, seen)
  }
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

/** Rows of an ACF repeater, read out of the flat `[row-N]` keys. */
function repeaterRows(record, containerId) {
  const rows = new Map()
  const pattern = new RegExp(`\\[${containerId}\\]\\[row-(\\d+)\\]`)

  for (const [key, value] of Object.entries(record.fields || {})) {
    const match = pattern.exec(key)
    if (!match) continue
    const index = Number(match[1])
    const rest = key.slice(match.index + match[0].length)
    const row = rows.get(index) || {}
    const ids = rest.match(/field_[0-9a-f]+/g) || []
    if (!ids.length) continue
    // Nested rows keep their whole remaining path so a deeper reader can
    // re-split them; a leaf keeps just its field id.
    row[ids.length === 1 ? ids[0] : rest] = value
    rows.set(index, row)
  }

  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row)
}

/** Rows of a repeater nested inside another repeater row. */
function nestedRows(record, containerId, rowIndex, innerId) {
  const rows = new Map()
  const prefix = `[${containerId}][row-${rowIndex}][${innerId}][row-`

  for (const [key, value] of Object.entries(record.fields || {})) {
    const at = key.indexOf(prefix)
    if (at < 0) continue
    const rest = key.slice(at + prefix.length)
    const match = /^(\d+)\](.*)$/.exec(rest)
    if (!match) continue
    const index = Number(match[1])
    const row = rows.get(index) || {}
    const ids = match[2].match(/field_[0-9a-f]+/g) || []
    if (!ids.length) continue
    row[ids.length === 1 ? ids[0] : match[2]] = value
    rows.set(index, row)
  }

  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row)
}

/** The `[group][child]` shape ACF uses for a non-repeating group. */
function groupField(record, containerId, childId) {
  return record.fields?.[`acf[${containerId}][${childId}]`]
}

function classifyEvent(plan, record) {
  const override = EVENT_OVERRIDES[record.id]
  if (override) {
    plan.notes.push(`event ${record.id}: ${override.type}${override.eventType ? ` / ${override.eventType}` : ''} — ${override.reason}`)
    return override
  }

  const terms = (record.fields['tax_input[events_category]'] || []).filter((id) => id !== '0')
  if (terms.includes(TERM_AWARDS)) return { type: 'awardsProgramme' }
  if (terms.includes(TERM_WEBINAR)) return { type: 'conferenceEvent', eventType: 'webinar' }
  if (terms.includes(TERM_SUMMITS)) return { type: 'conferenceEvent', eventType: 'summit' }
  if (terms.includes(TERM_BRIEFINGS)) return { type: 'conferenceEvent', eventType: 'briefing' }

  plan.blockers.push({
    code: 'event-without-category',
    message: `event ${record.id} carries events-category terms ${JSON.stringify(terms)}, which match no rule and no entry in EVENT_OVERRIDES`,
  })
  return undefined
}

function videoGallery(plan, record, spec, where, parentTitle) {
  const thumbId = textOf(groupField(record, spec.container, spec.thumb))
  const videos = []

  for (const [index, row] of repeaterRows(
    { fields: flattenGroupRepeater(record, spec.container, spec.repeater) },
    spec.repeater,
  ).entries()) {
    const vimeoId = textOf(row[spec.vimeoId])
    const name = textOf(row[spec.name])
    if (!vimeoId && !name) continue
    if (!VIMEO_ID.test(vimeoId || '')) {
      plan.problems.push(`${where} videos[${index}]: vimeoId ${JSON.stringify(vimeoId)} is not numeric`)
      continue
    }
    if (!name) {
      plan.problems.push(`${where} videos[${index}]: no name, which the schema requires`)
      continue
    }

    const groups = spec.categories
      ? nestedRows(record, spec.container, index, spec.categories)
      : []

    videos.push(
      pick({
        _type: 'video',
        vimeoId,
        name,
        categoryGroups: keyed(
          groups
            .map((row) =>
              pick({
                _type: 'winningCategories',
                group: textOf(row[spec.categoryGroup]),
                categories: textOf(row[spec.categoryList]),
              }),
            )
            .filter((row) => row.group || row.categories),
          'g',
        ),
      }),
    )
  }

  if (!videos.length && !thumbId) return undefined
  if (!videos.length) {
    plan.problems.push(`${where}: a thumbnail but no videos; the schema requires at least one video`)
    return undefined
  }

  return pick({
    _type: 'videoGallery',
    thumbnail: thumbId ? image(plan, thumbId, spec.role, { where, parentTitle }) : undefined,
    videos: keyed(videos, 'v'),
  })
}

/**
 * The winners/sponsors video repeaters sit inside an ACF group, so their rows
 * are keyed `[group][repeater][row-N][field]` rather than `[repeater][row-N]`.
 * Re-key them so `repeaterRows` can read them.
 */
function flattenGroupRepeater(record, containerId, repeaterId) {
  const out = {}
  const prefix = `acf[${containerId}][${repeaterId}]`
  for (const [key, value] of Object.entries(record.fields || {})) {
    if (!key.startsWith(prefix)) continue
    out[`acf[${repeaterId}]${key.slice(prefix.length)}`] = value
  }
  return out
}

function buildEvents(plan, records, ids) {
  const { companyIds, personIds, programmeIds, acclaimIds, categoryIds, winnerCompanies } = ids
  const winnersByEvent = ids.winnersByEvent

  for (const record of records) {
    const classification = classifyEvent(plan, record)
    if (!classification) continue

    const isAwards = classification.type === 'awardsProgramme'
    const where = `${classification.type} ${record.id}`
    const title = (record.title || '').trim()
    const seen = new Set(['rec:id', 'rec:title', 'rec:slug', 'rec:status', 'rec:content', 'tax:events_category'])

    consume(
      seen,
      F.startDate,
      F.startTime,
      F.endDate,
      F.endTime,
      F.timezoneCode,
      F.displayDateTime,
      F.eventLogo,
      F.venue,
      F.country,
      F.hybridOnlineEvent,
      F.sponsorTypes,
      F.sponsorTypeName,
      F.sponsors,
      F.sponsorBenefits,
      F.sponsorEmail,
      F.sponsorVideos,
      F.sponsorVideosThumb,
      F.sponsorVideosRepeater,
      F.sponsorVideoVimeoId,
      F.sponsorVideoName,
      F.sponsorVideoDetails,
      F.registerButtonLink,
      F.tickets,
      F.register,
      F.photographs,
      F.faqs,
      F.customTabs,
      F.customTabName,
      F.customTabContent,
      F.testimonials,
      F.charity,
      F.charityStatement,
      F.advisoryPanel,
    )

    const common = {
      title,
      slug: { _type: 'slug', current: record.slug || slugify(title) },
      body: prose(record.content, { where: `${where} body`, fallbackAlt: title }, plan),
      logo: image(plan, textOf(record.fields[`acf[${F.eventLogo}]`]), 'eventLogo', { where, parentTitle: title }),
      venue: singleRef(plan, record.fields[`acf[${F.venue}]`], companyIds, `${where} venue`),
      country: countryOf(record.fields[`acf[${F.country}]`]),
      startDate: acfDate(record.fields[`acf[${F.startDate}]`], plan.problems, `${where} startDate`),
      startTime: acfTime(record.fields[`acf[${F.startTime}]`], plan.problems, `${where} startTime`),
      endDate: acfDate(record.fields[`acf[${F.endDate}]`], plan.problems, `${where} endDate`),
      endTime: acfTime(record.fields[`acf[${F.endTime}]`], plan.problems, `${where} endTime`),
      timezoneCode: textOf(record.fields[`acf[${F.timezoneCode}]`]),
      hideDateTime: (record.fields[`acf[${F.displayDateTime}]`] || []).includes('hide') || undefined,
      sponsorTypes: keyed(
        repeaterRows(record, F.sponsorTypes)
          .map((row, index) => {
            const name = textOf(row[F.sponsorTypeName])
            const companies = resolveRefs(plan, row[F.sponsors], companyIds, `${where} sponsorTypes[${index}]`)
            return name && companies.length ? { _type: 'companyGroup', name, companies } : undefined
          })
          .filter(Boolean),
        's',
      ),
      sponsorBenefits: prose(record.fields[`acf[${F.sponsorBenefits}]`], { where: `${where} sponsorBenefits`, fallbackAlt: title }, plan),
      sponsorVideos: videoGallery(
        plan,
        record,
        {
          container: F.sponsorVideos,
          thumb: F.sponsorVideosThumb,
          repeater: F.sponsorVideosRepeater,
          vimeoId: F.sponsorVideoVimeoId,
          name: F.sponsorVideoName,
          role: 'sponsorVideosThumbnail',
        },
        `${where} sponsorVideos`,
        title,
      ),
      photographs: gallery(plan, record.fields[`acf[${F.photographs}]`], where, title),
      registerButtonLink: cleanUrl(plan, record.fields[`acf[${F.registerButtonLink}]`], `${where} registerButtonLink`),
      register: prose(record.fields[`acf[${F.register}]`], { where: `${where} register`, fallbackAlt: title }, plan),
      faqs: prose(record.fields[`acf[${F.faqs}]`], { where: `${where} faqs`, fallbackAlt: title }, plan),
      customTabs: keyed(
        repeaterRows(record, F.customTabs)
          .map((row, index) => {
            const name = textOf(row[F.customTabName])
            if (!name) return undefined
            return pick({
              _type: 'customTab',
              name,
              content: prose(row[F.customTabContent], { where: `${where} customTabs[${index}]`, fallbackAlt: title }, plan),
            })
          })
          .filter(Boolean),
        'c',
      ),
      legacyWpId: Number(record.id),
    }

    if (!common.startDate) {
      plan.blockers.push({ code: 'event-without-start-date', message: `${where}: startDate is required and empty` })
    }

    let document
    if (isAwards) {
      consume(
        seen,
        F.programmeTaxonomy,
        'tax:event_programme',
        F.keyDates,
        F.judgesIntro,
        F.judgesPanels,
        F.judgesPanelName,
        F.judges,
        F.judgesChair,
        F.nominationsOpening,
        F.nominationsClosing,
        F.winnersAnnouncement,
        F.categoriesContent,
        F.awardsSupplement,
        F.awardWinnersSupplement,
        F.connectAcclaim,
        F.finalists,
        F.winners,
        F.previousWinners,
        F.winnerVideos,
        F.winnerVideosThumb,
        F.winnerVideosRepeater,
        F.winnerVideoVimeoId,
        F.winnerVideoName,
        F.winningCategories,
        F.winningCategoryGroup,
        F.winningCategoryList,
        F.highlightsVideoId,
        F.highlightVideoThumb,
        F.hidePreviousHighlights,
        F.charityPartner,
      )

      const programmeTerm = record.fields[`acf[${F.programmeTaxonomy}]`]
      const highlightsVideoId = textOf(record.fields[`acf[${F.highlightsVideoId}]`])
      const rawWinners = record.fields[`acf[${F.winners}]`]
      const winnerRows = winnersByEvent.get(String(record.id)) || []

      if (!isEmpty(rawWinners) && winnerRows.length === 0) {
        plan.blockers.push({
          code: 'winners-blob-unparsed',
          message: `${where}: cyph_winners holds ${String(rawWinners).length} characters and parse-winners.py produced no pairs for it, so the whole winners list would be lost`,
        })
      }

      document = pick({
        _id: `event-wp-${record.id}`,
        _type: 'awardsProgramme',
        ...common,
        programme:
          programmeTerm && programmeTerm.value && programmeIds.has(String(programmeTerm.value))
            ? reference(programmeIds.get(String(programmeTerm.value)))
            : undefined,
        keyDates: prose(record.fields[`acf[${F.keyDates}]`], { where: `${where} keyDates`, fallbackAlt: title }, plan),
        judgesIntro: prose(record.fields[`acf[${F.judgesIntro}]`], { where: `${where} judgesIntro`, fallbackAlt: title }, plan),
        judgesPanels: keyed(
          repeaterRows(record, F.judgesPanels)
            .map((row, index) => {
              const name = textOf(row[F.judgesPanelName])
              const people = resolveRefs(plan, row[F.judges], personIds, `${where} judgesPanels[${index}]`)
              return name && people.length ? { _type: 'personGroup', name, people } : undefined
            })
            .filter(Boolean),
          'j',
        ),
        nominationsOpeningDate: acfDate(record.fields[`acf[${F.nominationsOpening}]`], plan.problems, `${where} nominationsOpeningDate`),
        nominationsClosingDate: acfDate(record.fields[`acf[${F.nominationsClosing}]`], plan.problems, `${where} nominationsClosingDate`),
        winnersAnnouncementDate: acfDate(record.fields[`acf[${F.winnersAnnouncement}]`], plan.problems, `${where} winnersAnnouncementDate`),
        categoriesContent: prose(record.fields[`acf[${F.categoriesContent}]`], { where: `${where} categoriesContent`, fallbackAlt: title }, plan),
        winners: keyed(winnerRows, 'w'),
        finalists: prose(record.fields[`acf[${F.finalists}]`], { where: `${where} finalists`, fallbackAlt: title }, plan),
        previousWinners: prose(record.fields[`acf[${F.previousWinners}]`], { where: `${where} previousWinners`, fallbackAlt: title }, plan),
        awardWinnersSupplement: prose(record.fields[`acf[${F.awardWinnersSupplement}]`], { where: `${where} awardWinnersSupplement`, fallbackAlt: title }, plan),
        acclaim: singleRef(plan, record.fields[`acf[${F.connectAcclaim}]`], acclaimIds, `${where} acclaim`),
        charityPartners: resolveRefs(plan, record.fields[`acf[${F.charityPartner}]`], companyIds, `${where} charityPartners`),
        winnerVideos: videoGallery(
          plan,
          record,
          {
            container: F.winnerVideos,
            thumb: F.winnerVideosThumb,
            repeater: F.winnerVideosRepeater,
            vimeoId: F.winnerVideoVimeoId,
            name: F.winnerVideoName,
            categories: F.winningCategories,
            categoryGroup: F.winningCategoryGroup,
            categoryList: F.winningCategoryList,
            role: 'winnerVideosThumbnail',
          },
          `${where} winnerVideos`,
          title,
        ),
        highlightsVideoId: highlightsVideoId && VIMEO_ID.test(highlightsVideoId) ? highlightsVideoId : undefined,
        highlightVideoThumbnail: image(plan, textOf(record.fields[`acf[${F.highlightVideoThumb}]`]), 'highlightVideoThumbnail', {
          where,
          parentTitle: title,
        }),
        hidePreviousYearsHighlightVideo:
          record.fields[`acf[${F.hidePreviousHighlights}]`] === '1' ? true : undefined,
      })

      if (highlightsVideoId && !VIMEO_ID.test(highlightsVideoId)) {
        plan.problems.push(`${where}: highlightsVideoId ${JSON.stringify(highlightsVideoId)} is not numeric`)
      }
    } else {
      consume(seen, F.agendaItineraries, F.itineraryTitle, F.agendaItinerary, F.agendaTime, F.agendaItem, F.agendaTitle, F.agendaText, F.legacyAgenda, F.speakerTypes, F.speakerTypeName, F.speakers, F.chairs, F.techDemos, F.techDemoTitle, F.techDemoCompany, F.techDemoDescription)

      const agenda = buildAgenda(plan, record, where, title)
      const legacyAgenda = prose(record.fields[`acf[${F.legacyAgenda}]`], { where: `${where} agendaText`, fallbackAlt: title }, plan)

      if (agenda.length && legacyAgenda) {
        plan.problems.push(`${where}: both the 2025 agenda repeater and the 2022 cyph_agenda are filled; the schema forbids both at once, the repeater wins`)
      }

      document = pick({
        _id: `event-wp-${record.id}`,
        _type: 'conferenceEvent',
        eventType: classification.eventType,
        ...common,
        speakerTypes: keyed(
          repeaterRows(record, F.speakerTypes)
            .map((row, index) => {
              const name = textOf(row[F.speakerTypeName])
              const people = resolveRefs(plan, row[F.speakers], personIds, `${where} speakerTypes[${index}]`)
              return name && people.length ? { _type: 'personGroup', name, people } : undefined
            })
            .filter(Boolean),
          'sp',
        ),
        chairs: resolveRefs(plan, record.fields[`acf[${F.chairs}]`], personIds, `${where} chairs`),
        agenda: keyed(agenda, 'a'),
        agendaText: agenda.length ? undefined : legacyAgenda,
        techDemos: keyed(
          repeaterRows(record, F.techDemos)
            .map((row, index) =>
              pick({
                _type: 'techDemo',
                title: textOf(row[F.techDemoTitle]),
                company: singleRef(plan, row[F.techDemoCompany], companyIds, `${where} techDemos[${index}]`),
                description: prose(row[F.techDemoDescription], { where: `${where} techDemos[${index}]`, fallbackAlt: title }, plan),
              }),
            )
            .filter((row) => row.title),
          'td',
        ),
      })
    }

    // The 10 Event fields that are empty on all 255 records raise nothing,
    // because isEmpty() skips them before the audit sees them. They are still
    // consumed above so that a re-export filling one of them lands rather than
    // blocking, except where the schema genuinely has no home.
    auditRecord(plan, 'events', record, seen)
    addDocument(plan, { ...document, _wpStatus: record.status })
    void categoryIds
    void winnerCompanies
  }
}

/** The 2025 three-level `agenda_itineraries` repeater. */
function buildAgenda(plan, record, where, title) {
  return repeaterRows(record, F.agendaItineraries)
    .map((_, index) => {
      const items = nestedRows(record, F.agendaItineraries, index, F.agendaItinerary)
        .map((row, item) => {
          const itemPath = `[${F.agendaItem}][${F.agendaTitle}]`
          const textPath = `[${F.agendaItem}][${F.agendaText}]`
          const itemTitle = textOf(row[itemPath] ?? row[F.agendaTitle])
          if (!itemTitle) return undefined
          return pick({
            _type: 'agendaItem',
            time: acfTime(row[F.agendaTime], plan.problems, `${where} agenda[${index}].items[${item}]`),
            title: itemTitle,
            text: prose(row[textPath] ?? row[F.agendaText], { where: `${where} agenda[${index}].items[${item}]`, fallbackAlt: title }, plan),
          })
        })
        .filter(Boolean)

      if (!items.length) return undefined

      const itineraryTitle = textOf(
        record.fields[`acf[${F.agendaItineraries}][row-${index}][${F.itineraryTitle}]`],
      )
      return pick({ _type: 'agenda', title: itineraryTitle, items: keyed(items, 'i') })
    })
    .filter(Boolean)
}

/* -------------------------------------------------------------------------- */
/* Field readers                                                              */
/* -------------------------------------------------------------------------- */

const textOf = (value) => {
  if (isEmpty(value)) return undefined
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'value' in value) return String(value.value).trim()
  return undefined
}

function countryOf(value) {
  if (isEmpty(value)) return undefined
  return String(value.value)
}

function cleanUrl(plan, value, where) {
  const raw = textOf(value)
  if (!raw) return undefined
  let url
  try {
    url = new URL(raw)
  } catch {
    plan.problems.push(`${where}: ${JSON.stringify(raw)} is not a URL, the schema requires one`)
    return undefined
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    plan.problems.push(`${where}: scheme ${url.protocol} is outside the http/https allowlist`)
    return undefined
  }
  return url.toString()
}

function taxonomyTags(plan, value) {
  if (!plan.options.accept.has('taxonomy-ids')) return undefined
  const terms = (value || []).filter((id) => id !== '0')
  return terms.length ? terms.map((id) => `wp-term-${id}`) : undefined
}

function resolveRefs(plan, value, ids, where) {
  const out = []
  for (const sourceId of refIds(value)) {
    plan.references.requested += 1
    const id = ids.get(String(sourceId))
    if (!id) {
      plan.references.failed.push(`${where}: no document for source id ${sourceId}`)
      continue
    }
    plan.references.resolved += 1
    if (!out.some((existing) => existing._ref === id)) out.push({ _key: `r${out.length}`, ...reference(id) })
  }
  return out
}

function singleRef(plan, value, ids, where) {
  const [first] = refIds(value)
  if (!first) return undefined
  plan.references.requested += 1
  const id = ids.get(String(first))
  if (!id) {
    plan.references.failed.push(`${where}: no document for source id ${first}`)
    return undefined
  }
  plan.references.resolved += 1
  return reference(id)
}

function gallery(plan, value, where, title) {
  const attachmentIds = (value || []).filter((id) => id && id !== '0')
  if (!attachmentIds.length) return undefined
  return keyed(
    attachmentIds
      .map((attachmentId, index) =>
        image(plan, String(attachmentId), 'photographsGallery', {
          where: `${where} photographs[${index}]`,
          parentTitle: title,
          position: index + 1,
          total: attachmentIds.length,
        }),
      )
      .filter(Boolean),
    'ph',
  )
}

/* -------------------------------------------------------------------------- */
/* Winners                                                                    */
/* -------------------------------------------------------------------------- */

function buildWinnerRows(plan, winners, categoryIds, companyMatches, companyIds) {
  const byEvent = new Map()
  let unresolved = 0

  for (const pair of winners) {
    const eventId = String(pair.eventId)
    const categoryKey = normName(pair.category || '')
    const winnerKey = normName(pair.winner || '')
    const categoryId = categoryIds.get(categoryKey)
    const companyId = companyMatches.resolved.get(winnerKey) || companyMatches.created.get(winnerKey)

    if (!categoryId || !companyId) {
      unresolved += 1
      plan.problems.push(
        `winner pair on event ${eventId} is unresolved: category ${JSON.stringify(pair.category)} -> ${categoryId || 'MISSING'}, winner ${JSON.stringify(pair.winner)} -> ${companyId || 'MISSING'}`,
      )
      continue
    }

    const rows = byEvent.get(eventId) || []
    rows.push(
      pick({
        _type: 'winner',
        categoryGroup: pair.group ? String(pair.group).trim() : undefined,
        category: reference(categoryId),
        company: reference(companyId),
      }),
    )
    byEvent.set(eventId, rows)
  }

  plan.stats.winnerRows = winners.length - unresolved
  plan.stats.winnerRowsUnresolved = unresolved
  void companyIds
  return byEvent
}

/* -------------------------------------------------------------------------- */
/* Asset map                                                                  */
/* -------------------------------------------------------------------------- */

function loadAssetMap(options) {
  if (!existsSync(ASSET_MAP_PATH)) {
    return { version: 1, projectId: options.projectId, dataset: options.dataset, assets: {}, failed: {} }
  }
  const map = JSON.parse(readFileSync(ASSET_MAP_PATH, 'utf8'))
  if (map.dataset && map.dataset !== options.dataset) {
    throw new Error(
      `asset-map.json was built for dataset "${map.dataset}" and this run targets "${options.dataset}". Asset ids are per dataset; move the file aside or pass the matching dataset.`,
    )
  }
  map.assets ||= {}
  map.failed ||= {}
  return map
}

function saveAssetMap(map) {
  map.updatedAt = new Date().toISOString()
  const temporary = `${ASSET_MAP_PATH}.tmp`
  mkdirSync(dirname(ASSET_MAP_PATH), { recursive: true })
  writeFileSync(temporary, `${JSON.stringify(map, null, 2)}\n`)
  renameSync(temporary, ASSET_MAP_PATH)
}

/**
 * Fetch every wanted attachment from clearviewpublishing.com and upload it to
 * Sanity, recording each in the asset map before moving on.
 *
 * Concurrency 3 with a 300 ms floor per worker, so roughly 10 requests a second
 * at the ceiling. Two reasons, neither of them measured on this host, which is
 * why it is a flag:
 *
 *   - the client's own robots.txt asks crawl-delay 60 on wealthbriefing.com and
 *     30 on the others, and README records the legacy estate returning
 *     empty-body 500s after about 5 requests in a minute. Nothing about the
 *     uploads directory has been measured, and a run that goes fast and
 *     silently drops files is worse than a slow one (wp-extract.js header).
 *   - 6,648 files at that rate is about 11 minutes, which is not the constraint.
 *
 * WordPress recorded no filesize for a single one of the 6,648, so the total
 * byte count is genuinely unknown before the first run. Sanity deduplicates
 * uploads by SHA-1, so an interrupted run that re-uploads a file it already
 * sent gets the same asset id back rather than a second copy.
 */
async function runAssetPhase(plan, client) {
  const wanted = [...plan.assetsWanted.values()]
  const pending = wanted.filter((item) => !plan.assetMap.assets[item.key])
  const { concurrency, assetDelay } = plan.options

  console.log(`\nassets: ${wanted.length} wanted, ${wanted.length - pending.length} already in the map, ${pending.length} to fetch`)
  console.log(`assets: concurrency ${concurrency}, minimum ${assetDelay} ms per request per worker\n`)

  let done = 0
  let failed = 0
  let consecutiveFailures = 0
  const queue = pending.slice()

  const worker = async () => {
    for (;;) {
      const item = queue.shift()
      if (!item) return
      const startedAt = Date.now()
      try {
        const asset = await uploadOne(client, item)
        plan.assetMap.assets[item.key] = {
          _id: asset._id,
          url: item.url,
          filename: item.filename,
          origin: item.origin,
          uploadedAt: new Date().toISOString(),
        }
        delete plan.assetMap.failed[item.key]
        consecutiveFailures = 0
        done += 1
        if (done % 25 === 0) {
          saveAssetMap(plan.assetMap)
          console.log(`assets: ${done}/${pending.length} uploaded, ${failed} failed`)
        }
      } catch (error) {
        failed += 1
        consecutiveFailures += 1
        plan.assetMap.failed[item.key] = { url: item.url, error: String(error.message || error) }
        console.error(`assets: FAILED ${item.key} ${item.url} — ${error.message || error}`)
        if (consecutiveFailures >= 5) {
          queue.length = 0
          throw new Error('5 consecutive upload failures; stopping so the map stays trustworthy. Re-run to resume.')
        }
      }
      const elapsed = Date.now() - startedAt
      if (elapsed < assetDelay) await sleep(assetDelay - elapsed)
    }
  }

  try {
    await Promise.all(Array.from({ length: concurrency }, worker))
  } finally {
    saveAssetMap(plan.assetMap)
  }

  console.log(`\nassets: ${done} uploaded, ${failed} failed, map at ${ASSET_MAP_PATH}`)
  return { done, failed }
}

async function uploadOne(client, item, attempt = 0) {
  try {
    const response = await fetch(item.url, { redirect: 'follow' })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) throw new Error('empty body')
    // Asset type follows the source MIME type. A PDF uploaded as an image is
    // refused by Sanity, and an image uploaded as a file loses every transform.
    return await client.assets.upload(item.kind === 'file' ? 'file' : 'image', buffer, {
      filename: item.filename,
      contentType: item.mimeType || undefined,
    })
  } catch (error) {
    if (attempt >= 2) throw error
    await sleep(1500 * (attempt + 1))
    return uploadOne(client, item, attempt + 1)
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/* -------------------------------------------------------------------------- */
/* Final assertions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The shape checks that have to hold whatever the source does. Each one is a
 * rule written down somewhere else in the repository; the point of repeating it
 * here is that a schema rule fails in Studio, after the write, one document at
 * a time.
 */
function assertDocuments(plan, { assetsResolved }) {
  const ids = new Set()

  for (const document of plan.documents) {
    const id = document._id

    if (ids.has(id)) plan.blockers.push({ code: 'duplicate-id', message: `two documents claim _id ${id}` })
    ids.add(id)

    if (id.includes('.')) {
      plan.blockers.push({
        code: 'dotted-id',
        message: `_id ${id} contains a dot. Sanity serves anonymous readers root-path ids only and the site reads published content without a token, so a dotted id is invisible to the site.`,
      })
    }

    walk(document, (node, path) => {
      if (node && typeof node === 'object' && node.wpImage) {
        plan.blockers.push({ code: 'wpimage-survived', message: `${id} ${path} still carries a wpImage sidecar` })
      }
      if (node && typeof node === 'object' && node._type === 'link' && node.href) {
        const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(node.href)?.[1]?.toLowerCase()
        if (!['http', 'https', 'mailto', 'tel'].includes(scheme)) {
          plan.blockers.push({
            code: 'link-scheme',
            message: `${id} ${path}: link href ${JSON.stringify(node.href)} is outside the http/https/mailto/tel allowlist`,
          })
        }
      }
      if (assetsResolved && node && typeof node === 'object' && node._type === 'image' && !node.asset) {
        plan.blockers.push({ code: 'image-without-asset', message: `${id} ${path}: image with no asset renders as nothing` })
      }
      if (assetsResolved && node && typeof node === 'object' && node._type === 'file' && !node.asset) {
        plan.blockers.push({ code: 'file-without-asset', message: `${id} ${path}: file with no asset has nothing to download` })
      }
      if (node && typeof node === 'object' && node._type === 'image' && node.asset && !node.alt) {
        plan.blockers.push({
          code: 'image-without-alt',
          message: `${id} ${path}: an attached image with no alt fails schema validation and blocks publishing in Studio`,
        })
      }
    })
  }

  // Slugs on the three types that keep a live URL on clearviewpublishing.com.
  for (const [types, prefix] of [
    [['awardsProgramme', 'conferenceEvent'], '/events/'],
    [['acclaim'], '/acclaim/'],
    [['resource'], '/resource/'],
  ]) {
    const seen = new Map()
    for (const type of types) {
      for (const document of plan.byType.get(type) || []) {
        const slug = document.slug?.current
        if (!slug) {
          plan.blockers.push({ code: 'missing-slug', message: `${document._id}: no slug, ${prefix}{slug}/ is a live URL` })
          continue
        }
        if (seen.has(slug)) {
          plan.blockers.push({
            code: 'duplicate-slug',
            message: `${prefix}${slug}/ is claimed by both ${seen.get(slug)} and ${document._id}`,
          })
        }
        seen.set(slug, document._id)
      }
    }
  }

  // Every reference must point at a document this run creates.
  for (const document of plan.documents) {
    walk(document, (node, path) => {
      if (node && typeof node === 'object' && node._type === 'reference' && node._ref) {
        if (!ids.has(node._ref) && !node._ref.startsWith('image-') && !node._ref.startsWith('file-')) {
          plan.blockers.push({
            code: 'dangling-reference',
            message: `${document._id} ${path}: reference to ${node._ref}, which this run does not create`,
          })
        }
      }
    })
  }
}

function walk(node, visit, path = '') {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, visit, `${path}[${index}]`))
    return
  }
  if (!node || typeof node !== 'object') return
  visit(node, path || '(root)')
  for (const [key, value] of Object.entries(node)) walk(value, visit, path ? `${path}.${key}` : key)
}

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The counts the model predicts, from MIGRATION-CONTEXT section 5. Printed
 * against the actual result on every run, so a drift is visible here rather
 * than discovered in Studio.
 *
 * Two of them this loader does not reproduce, and the report says so rather
 * than quietly adopting either number:
 *
 *   company        1,994 expected, 2,291 built. 1,451 source records (the 3
 *                  with an empty post_title recovered, not skipped) plus 840
 *                  winner names that match no company. The 543 in the estimate
 *                  came from a matching pass that counted a name as resolved on
 *                  a partial match; this one matches only exactly, because a
 *                  partial match files an award under the wrong company.
 *
 *   awardCategory  1,168 expected, 1,155 built. 1,168 is the count of distinct
 *                  category names compared case-insensitively. 13 more pairs
 *                  differ only by a curly apostrophe, a curly quote or an
 *                  en-dash against a hyphen, and keeping them apart would
 *                  publish 13 duplicate category pages under template 07.
 */
const EXPECTED = {
  awardsProgrammeGroup: 13,
  company: 1994,
  person: 1558,
  awardCategory: 1168,
  acclaim: 8,
  awardsProgramme: 119,
  conferenceEvent: 136,
  resource: 12,
}

function report(plan) {
  const line = (text = '') => console.log(text)

  line()
  line('='.repeat(78))
  line('OPTIONS — every content decision this run made, printed whether or not it was changed')
  line('='.repeat(78))
  line(`  --inline-foreign-images=${plan.options.inlineForeignImages}`)
  line(`  --unpublished=${plan.options.unpublished}`)
  line(`  --acclaim-embed=${plan.options.acclaimEmbed}`)
  line(`  --gallery-alt=${plan.options.galleryAlt}`)
  line(`  --accept=${[...plan.options.accept].join(',') || '(nothing)'}`)
  if (plan.options.accept.has('taxonomy-ids')) {
    line('    taxonomy-ids accepted: company_category and people_category land as `wp-term-<id>` tags, to be renamed once the term names are re-extracted')
  }

  line()
  line('='.repeat(78))
  line('DOCUMENTS')
  line('='.repeat(78))
  const order = ['awardsProgrammeGroup', 'company', 'person', 'awardCategory', 'acclaim', 'awardsProgramme', 'conferenceEvent', 'resource']
  for (const type of order) {
    const count = (plan.byType.get(type) || []).length
    const expected = EXPECTED[type]
    const note = expected === undefined ? '' : count === expected ? '  ok' : `  EXPECTED ${expected}, differs by ${count - expected}`
    line(`  ${String(count).padStart(6)}  ${type}${note}`)
  }
  line(`  ${String(plan.documents.length).padStart(6)}  total`)
  const unpublished = plan.documents.filter((document) => document._wpStatus && document._wpStatus !== 'publish').length
  const fate = { draft: 'written as Sanity drafts', publish: 'published despite being unpublished in WordPress', skip: 'not written at all' }
  line(`  ${String(unpublished).padStart(6)}  draft/pending/private in WordPress, ${fate[plan.options.unpublished]} (--unpublished=${plan.options.unpublished})`)

  line()
  line('REFERENCES')
  line(`  requested ${plan.references.requested}, resolved ${plan.references.resolved}, failed ${plan.references.failed.length}`)
  for (const failure of plan.references.failed.slice(0, 20)) line(`    ${failure}`)
  if (plan.references.failed.length > 20) line(`    ... ${plan.references.failed.length - 20} more`)

  line()
  line('WINNERS')
  const match = plan.stats.winnerMatching || {}
  line(`  ${plan.stats.winnerRows} rows written, ${plan.stats.winnerRowsUnresolved} unresolved`)
  line(`  winner name -> company: exact ${match.exact}, punctuation ${match.punctuation}, legal suffix ${match.legalSuffix}, created ${match.created}`)
  line(`  award categories: ${(plan.byType.get('awardCategory') || []).length} (${plan.stats.awardCategorySlugCollisions} slug collisions disambiguated by hash)`)

  line()
  line('IMAGES')
  line(`  attachments wanted ${plan.assetsWanted.size}, already in asset-map ${Object.keys(plan.assetMap.assets).length}`)
  line(`  inline prose images: ${plan.inlineImages.resolved.length} resolved, ${plan.inlineImages.foreign.length} on non-library hosts (--inline-foreign-images=${plan.options.inlineForeignImages}), ${plan.inlineImages.unresolvable.length} unresolvable`)
  const foreignHosts = new Map()
  for (const item of plan.inlineImages.foreign) foreignHosts.set(item.host, (foreignHosts.get(item.host) || 0) + 1)
  for (const [host, count] of [...foreignHosts].sort((a, b) => b[1] - a[1])) line(`    ${String(count).padStart(4)}  ${host}`)
  line('  alt text on attached images:')
  for (const [kind, count] of [...plan.altSources].sort((a, b) => b[1] - a[1])) line(`    ${String(count).padStart(5)}  ${kind}`)

  line()
  line('IGNORE LIST — non-empty source fields with a written reason and no schema address')
  if (!plan.ignored.size) line('  (nothing)')
  for (const [entry, hits] of plan.ignored) {
    line(`  ${entry.leaf}  ${hits.length} value${hits.length === 1 ? '' : 's'}${entry.blocker ? `  [blocker: ${entry.blocker}]` : ''}`)
    line(`      ${entry.reason.replace(/\s+/g, ' ')}`)
  }

  if (plan.notes.length) {
    line()
    line('NOTES')
    for (const note of plan.notes) line(`  ${note}`)
  }

  if (plan.removed.length) {
    line()
    line(`REMOVED FROM PROSE (${plan.removed.length}) — elements richText has no member for, reported by the converter`)
    const kinds = new Map()
    for (const item of plan.removed) {
      const kind = /<(\w+)> removed/.exec(item)?.[1] || 'link scheme'
      const bucket = kinds.get(kind) || []
      bucket.push(item)
      kinds.set(kind, bucket)
    }
    for (const [kind, bucket] of [...kinds].sort((a, b) => b[1].length - a[1].length)) {
      line(`  ${String(bucket.length).padStart(4)}  ${kind}`)
      for (const item of bucket.slice(0, 3)) line(`        ${item}`)
      if (bucket.length > 3) line(`        ... ${bucket.length - 3} more`)
    }
  }

  if (plan.problems.length) {
    line()
    line(`PROBLEMS (${plan.problems.length}) — content the loader carried anyway, each one worth a look`)
    const grouped = new Map()
    for (const problem of plan.problems) {
      const key = problem.replace(/\b\d+\b/g, 'N').slice(0, 70)
      const bucket = grouped.get(key) || []
      bucket.push(problem)
      grouped.set(key, bucket)
    }
    for (const [, bucket] of [...grouped].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
      line(`  ${String(bucket.length).padStart(4)}  ${bucket[0]}`)
      if (bucket.length > 1) line(`        ... and ${bucket.length - 1} more like it`)
    }
  }

  const accepted = collapseBlockers(plan.blockers.filter((blocker) => plan.options.accept.has(blocker.code)))
  const blockers = collapseBlockers(plan.blockers.filter((blocker) => !plan.options.accept.has(blocker.code)))

  if (accepted.length) {
    line()
    line('ACCEPTED — blockers waived by --accept on this run, listed so the waiver stays visible')
    for (const [code, group] of accepted) {
      line(`  [${code}]  ${group.length} occurrence${group.length === 1 ? '' : 's'}`)
      for (const message of group.slice(0, 4)) line(`      ${message}`)
      if (group.length > 4) line(`      ... ${group.length - 4} more`)
    }
  }

  line()
  line('='.repeat(78))
  if (!blockers.length) {
    line('BLOCKERS: none. The plan is writable.')
  } else {
    line(`BLOCKERS (${blockers.reduce((total, [, group]) => total + group.length, 0)} across ${blockers.length} codes) — the write is refused until each is accepted or fixed`)
    for (const [code, group] of blockers) {
      line()
      line(`  [${code}]  ${group.length} occurrence${group.length === 1 ? '' : 's'}   accept with --accept=${code}`)
      for (const message of group.slice(0, 6)) line(`      ${message}`)
      if (group.length > 6) line(`      ... ${group.length - 6} more`)
    }
  }
  line('='.repeat(78))
  return blockers
}

function collapseBlockers(blockers) {
  const grouped = new Map()
  for (const blocker of blockers) {
    const message = blocker.message
      ? blocker.message
      : `${blocker.leaf} on ${blocker.count} record${blocker.count === 1 ? '' : 's'} — ${blocker.entry.reason.replace(/\s+/g, ' ')}`
    const bucket = grouped.get(blocker.code) || []
    bucket.push(message)
    grouped.set(blocker.code, bucket)
  }
  return [...grouped]
}

/* -------------------------------------------------------------------------- */
/* Write                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reference order, from MIGRATION-CONTEXT section 5. A reference to a document
 * that does not exist yet is accepted by the API and shows in Studio as a
 * broken link, so the order is a correctness requirement and not a preference.
 */
const WRITE_ORDER = ['awardsProgrammeGroup', 'company', 'person', 'awardCategory', 'acclaim', 'awardsProgramme', 'conferenceEvent', 'resource']

async function runWritePhase(plan, client) {
  let written = 0

  for (const type of WRITE_ORDER) {
    const documents = plan.byType.get(type) || []
    if (!documents.length) continue

    for (let index = 0; index < documents.length; index += 50) {
      const batch = documents.slice(index, index + 50)
      let transaction = client.transaction()
      for (const document of batch) transaction = transaction.createOrReplace(forWrite(document, plan.options))
      await transaction.commit({ visibility: 'async' })
      written += batch.length
    }
    console.log(`written: ${String(documents.length).padStart(6)}  ${type}`)
  }

  console.log(`\nwritten: ${written} documents into ${plan.options.dataset}`)
  return written
}

/**
 * Strip the loader's own bookkeeping and decide published or draft.
 *
 * `drafts.` is the one place a dot is allowed in an _id, and only because it is
 * Sanity's own reserved prefix for an unpublished document rather than part of
 * the content id. The rule it bends exists so that the site, which reads
 * published content anonymously, can see a document; for these 11 records
 * invisibility is the point. None of their URLs appears in baseline.csv.
 */
function forWrite(document, options) {
  const { _wpStatus, ...rest } = document
  const clean = JSON.parse(
    JSON.stringify(rest, (key, value) => (key === '_wpAssetKey' ? undefined : value)),
  )
  const unpublished = _wpStatus && _wpStatus !== 'publish'
  if (unpublished && options.unpublished === 'draft') return { ...clean, _id: `drafts.${clean._id}` }
  return clean
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

const USAGE = `
Usage: node scripts/load-to-sanity.mjs --dataset <name> [options]

  --dataset <name>            required. "production" is refused.
  --commit                    actually write. Without it, nothing is sent.
  --assets                    run the asset phase (needs --commit).
  --plan <path>               write the built documents to a JSON file.

  --accept=<code>[,<code>]    proceed despite a named blocker. Repeatable.
  --inline-foreign-images=drop|keep     default drop
  --unpublished=draft|skip|publish      default draft
  --acclaim-embed=keep|drop             default keep
  --gallery-alt=positional|bare         default positional
  --concurrency <n>           asset workers, default 3
  --asset-delay <ms>          minimum ms per request per worker, default 300
`

function parseArgs(argv) {
  const options = {
    dataset: undefined,
    commit: false,
    assets: false,
    plan: undefined,
    accept: new Set(),
    inlineForeignImages: 'drop',
    unpublished: 'draft',
    acclaimEmbed: 'keep',
    galleryAlt: 'positional',
    concurrency: 3,
    assetDelay: 300,
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'hcxqlh4h',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const [flag, inline] = argument.split('=')
    const next = () => inline ?? argv[++index]

    switch (flag) {
      case '--dataset': options.dataset = next(); break
      case '--commit': options.commit = true; break
      case '--assets': options.assets = true; break
      case '--plan': options.plan = next(); break
      case '--accept': for (const code of next().split(',')) options.accept.add(code.trim()); break
      case '--inline-foreign-images': options.inlineForeignImages = next(); break
      case '--unpublished': options.unpublished = next(); break
      case '--acclaim-embed': options.acclaimEmbed = next(); break
      case '--gallery-alt': options.galleryAlt = next(); break
      case '--concurrency': options.concurrency = Number(next()); break
      case '--asset-delay': options.assetDelay = Number(next()); break
      case '--help': case '-h': console.log(USAGE); process.exit(0); break
      default: throw new Error(`unknown argument ${argument}${USAGE}`)
    }
  }

  if (!options.dataset) throw new Error(`--dataset is required${USAGE}`)
  if (options.dataset === 'production') {
    throw new Error('refusing to touch the production dataset. Create a sandbox: npx sanity dataset create migration-dev')
  }
  if (!['drop', 'keep'].includes(options.inlineForeignImages)) throw new Error('--inline-foreign-images takes drop or keep')
  if (!['draft', 'skip', 'publish'].includes(options.unpublished)) throw new Error('--unpublished takes draft, skip or publish')
  if (!['keep', 'drop'].includes(options.acclaimEmbed)) throw new Error('--acclaim-embed takes keep or drop')
  if (!['positional', 'bare'].includes(options.galleryAlt)) throw new Error('--gallery-alt takes positional or bare')

  return options
}

/** `.env.local` without a dependency. The token is never printed. */
function loadEnv() {
  const path = `${ROOT}/.env.local`
  if (!existsSync(path)) return
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(raw)
    if (!match) continue
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (value && process.env[match[1]] === undefined) process.env[match[1]] = value
  }
}

async function main(argv) {
  loadEnv()
  const options = parseArgs(argv)

  console.log(`project ${options.projectId}, dataset ${options.dataset}, ${options.commit ? 'COMMIT' : 'dry run'}`)

  const plan = newPlan(options)
  const events = readJson(`${SOURCE_DIR}/wp-events.json`)
  const source = readJson(`${SOURCE_DIR}/wp-source.json`)
  const winners = readJson(`${SOURCE_DIR}/wp-events-winners.json`)
  const media = readJson(`${SOURCE_DIR}/wp-media.json`)

  if (!media.complete) {
    plan.blockers.push({ code: 'media-incomplete', message: 'wp-media.json reports complete:false; some attachment URLs were never resolved' })
  }
  plan.media = media.media

  const eventRecords = events.records
  const companyRecords = source.types.companies.records
  const peopleRecords = source.types.people.records
  const acclaimRecords = source.types.acclaim.records
  const resourceRecords = source.types.resource.records

  console.log(
    `inputs: events ${eventRecords.length}, companies ${companyRecords.length}, people ${peopleRecords.length}, acclaim ${acclaimRecords.length}, resource ${resourceRecords.length}, winner pairs ${winners.length}, attachments ${Object.keys(plan.media).length}`,
  )

  assertRelationMirror(plan, companyRecords, peopleRecords)

  const programmeIds = buildProgrammeGroups(plan, eventRecords)
  const companyIds = buildCompanies(plan, companyRecords)
  const personIds = buildPeople(plan, peopleRecords, companyIds)
  const categoryIds = buildAwardCategories(plan, winners)
  const winnerCompanies = buildWinnerCompanies(plan, winners, companyRecords, companyIds)
  const acclaimProgramme = linkAcclaimToProgramme(plan, eventRecords, programmeIds)
  const acclaimIds = buildAcclaim(plan, acclaimRecords, acclaimProgramme)
  const winnersByEvent = buildWinnerRows(plan, winners, categoryIds, winnerCompanies, companyIds)

  buildEvents(plan, eventRecords, {
    companyIds,
    personIds,
    programmeIds,
    acclaimIds,
    categoryIds,
    winnerCompanies,
    winnersByEvent,
  })

  buildResources(plan, resourceRecords, companyIds, personIds)

  if (options.unpublished === 'skip') {
    const before = plan.documents.length
    plan.documents = plan.documents.filter((document) => !document._wpStatus || document._wpStatus === 'publish')
    for (const [type, list] of plan.byType) {
      plan.byType.set(type, list.filter((document) => !document._wpStatus || document._wpStatus === 'publish'))
    }
    console.log(`--unpublished=skip removed ${before - plan.documents.length} documents`)
  }

  const assetsResolved =
    plan.assetsWanted.size > 0 && [...plan.assetsWanted.keys()].every((key) => plan.assetMap.assets[key])

  assertDocuments(plan, { assetsResolved: assetsResolved || !options.commit })
  const blockers = report(plan)

  if (options.plan) {
    // The write shape, not the internal one, so what is inspected is what
    // would be sent: `drafts.` prefixes applied, bookkeeping keys stripped.
    writeFileSync(options.plan, `${JSON.stringify(plan.documents.map((document) => forWrite(document, options)), null, 2)}\n`)
    console.log(`\nplan written to ${options.plan}`)
  }

  if (!options.commit) {
    console.log('\ndry run: nothing was written. Add --commit to write.')
    return blockers.length ? 1 : 0
  }

  if (blockers.length) {
    console.error('\nrefusing to write while blockers stand. Fix them or accept each by name.')
    return 1
  }

  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) throw new Error('SANITY_API_WRITE_TOKEN is empty. Put a write token in .env.local.')

  const client = createClient({
    projectId: options.projectId,
    dataset: options.dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-09-01',
    token,
    useCdn: false,
  })

  if (options.assets) {
    const result = await runAssetPhase(plan, client)
    if (result.failed) {
      console.error(`\n${result.failed} assets failed. Re-run with --assets to resume, then run again without it to write documents.`)
      return 1
    }
    console.log('\nassets done. Re-run without --assets to write documents with the asset references resolved.')
    return 0
  }

  if (!assetsResolved) {
    console.error('\nrefusing to write documents before the asset phase: an image with no asset renders as nothing. Run with --assets --commit first.')
    return 1
  }

  await runWritePhase(plan, client)
  return 0
}

/**
 * Pods keeps the company <-> person relation in `wp_podsrel` and both screens
 * were scraped, so the loader can check rather than trust: if any pair exists
 * only on the company side, dropping `pods_meta_people` would lose it.
 * Measured 2026-09-17: 1,548 company-side pairs, 1,549 person-side, 0
 * company-only.
 */
function assertRelationMirror(plan, companies, people) {
  const fromPerson = new Set()
  const fromCompany = new Set()
  for (const person of people) for (const company of refIds(person.fields?.pods_meta_company)) fromPerson.add(`${person.id}|${company}`)
  for (const company of companies) for (const person of refIds(company.fields?.pods_meta_people)) fromCompany.add(`${person}|${company.id}`)

  const companyOnly = [...fromCompany].filter((pair) => !fromPerson.has(pair))
  plan.stats.relationPairs = { person: fromPerson.size, company: fromCompany.size, companyOnly: companyOnly.length }

  if (companyOnly.length) {
    plan.blockers.push({
      code: 'relation-asymmetry',
      message: `${companyOnly.length} company <-> person pairs exist only on the company side, so ignoring pods_meta_people would lose them: ${companyOnly.slice(0, 5).join(', ')}`,
    })
  }
}

/**
 * acclaim.programme, derived from the event that links to the acclaim through
 * cyph_connect_acclaim, because the `acclaim---awards-programme` taxonomy
 * exported ids without labels.
 *
 * 9 links cover 8 acclaim records. 46385 is linked from two events on two
 * different programmes - it is the joint "WealthBriefingAsia & Greater China"
 * issue - so it is left unset rather than filed under one of them, which is
 * also the one record whose own taxonomy field is empty.
 */
function linkAcclaimToProgramme(plan, events, programmeIds) {
  const candidates = new Map()

  for (const record of events) {
    const link = record.fields[`acf[${F.connectAcclaim}]`]
    if (!link || !link.value) continue
    const term = record.fields[`acf[${F.programmeTaxonomy}]`]
    if (!term || !term.value) continue
    const set = candidates.get(String(link.value)) || new Set()
    set.add(String(term.value))
    candidates.set(String(link.value), set)
  }

  const out = new Map()
  for (const [acclaimId, terms] of candidates) {
    if (terms.size !== 1) {
      plan.notes.push(
        `acclaim ${acclaimId}: linked from events on ${terms.size} different programmes (${[...terms].join(', ')}), so programme is left unset rather than guessed`,
      )
      continue
    }
    const [term] = terms
    if (programmeIds.has(term)) out.set(acclaimId, programmeIds.get(term))
  }

  return out
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    console.error(`\n${error.message}`)
    process.exit(1)
  },
)
