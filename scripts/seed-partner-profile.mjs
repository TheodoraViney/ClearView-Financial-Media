#!/usr/bin/env node
/**
 * One-off seed for the partner profile page (/companies/{slug} on ClearView), DRY RUN by default.
 *
 * 1. The labels singleton `partner-profile-page` (type partnerProfilePage): created with the design texts when it does
 *    not exist, otherwise its fields are set to them.
 * 2. The WIZE company `company-wp-17388`: the "Profile page" fields filled with the design's sample record
 *    (Claude Design wb-g-partner-profile v1.0, `sample-record=complete`), verbatim. `about` is set only while empty.
 *    Activity and recognition are derived from the awards editions, so nothing is written for them.
 *    The hero image (design asset wize-cover-1.jpg) cannot be read from Claude Design as a file: pass a local copy with
 *    --image=PATH to upload it as `profileImage` (uploaded on --apply only).
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-partner-profile.mjs                 # prints the plan, writes nothing
 *   node --env-file=.env.local scripts/seed-partner-profile.mjs --apply         # backup, then one transaction
 *   ... --image=/path/to/wize-cover-1.jpg                                        # also upload the hero image
 *
 * Stops when either document has a draft or a version. Every patch carries ifRevisionID. Backs up both documents to
 * BACKUP_DIR (default: the system temp folder) before writing. Delete this script after use.
 */
import { randomUUID } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { createClient } from '@sanity/client'

const BACKUPS = process.env.BACKUP_DIR || join(tmpdir(), 'sanity-backups')
const PAGE_ID = 'partner-profile-page'
const COMPANY_ID = 'company-wp-17388'

const apply = process.argv.includes('--apply')
const imagePath = process.argv.find((arg) => arg.startsWith('--image='))?.slice('--image='.length)
const { NEXT_PUBLIC_SANITY_PROJECT_ID: projectId, NEXT_PUBLIC_SANITY_DATASET: dataset } = process.env
const token = apply ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN

if (!projectId || !dataset || !token) {
  console.error(`Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET or ${apply ? 'SANITY_API_WRITE_TOKEN' : 'SANITY_API_READ_TOKEN'}`)
  process.exit(1)
}

if (imagePath && !existsSync(imagePath)) {
  console.error(`No file at ${imagePath}`)
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion: '2026-09-01', useCdn: false, token })

const key = () => randomUUID().replace(/-/g, '').slice(0, 12)
const span = (text) => ({ _type: 'span', _key: key(), text, marks: [] })
const block = (text, style = 'normal') => ({ _type: 'block', _key: key(), style, markDefs: [], children: [span(text)] })
const heading = (text, level = 'h2') => [block(text, level)]
const external = (url) => ({ kind: 'external', external: url })
const linkRow = (label, url) => ({ _type: 'linkRow', _key: key(), label, link: external(url) })

// The labels: the schema's initial values, which are the design texts.
const page = {
  breadcrumbHomeLabel: 'Home',
  breadcrumbProfileLabel: 'Partner profile',
  typeLabel: 'Partner profile',
  websiteLinkLabel: 'Visit {name} website',
  atAGlanceLabel: 'At a glance',
  fieldsHeading: heading('Clients and platform'),
  activityHeading: heading('WealthBriefing activity and recognition'),
  sponsorActivityHeading: heading('Sponsor activity', 'h3'),
  sponsorActivityText: 'Named as a sponsor of {title}.',
  recognitionHeading: heading('Recognition', 'h3'),
  coverageHeading: heading('Sponsor and editorial coverage'),
  sponsorInterviewsHeading: heading('Sponsor interviews', 'h3'),
  archiveCoverageHeading: heading('Awards archive coverage', 'h3'),
  officialLinksHeading: heading('Official links'),
}

// The archived interviews live on WealthBriefing (the archive's front domain), at /archive/{id}/{slug}
// (archiveArticlePath in src/lib/archive.ts). Absolute, so the link works from the ClearView host.
const WB_ARCHIVE = 'https://wealthbriefing.com/archive'

const companyFields = {
  profileMetrics: [
    ['120', 'clients in 26 countries'],
    ['3,000+', 'users representing 120+ B CHF AuM'],
    ['250+', 'custodian connectors'],
    ['30+', 'trading rooms'],
    ['50+', 'employees in 4 offices'],
  ].map(([value, text]) => ({ _type: 'keyFinding', _key: key(), value, text })),
  profileFields: [
    {
      label: 'Client types',
      values: [
        'Wealth managers / External Asset Managers',
        'Asset managers / Funds',
        'Family offices',
        'Pension funds',
        'Securities firms / Broker-dealers',
        'Private banks',
      ],
    },
    {
      label: 'Platform areas',
      values: [
        'Asset management and reporting',
        'Custody and private banking',
        'Portfolio management',
        'Compliance and regulatory workflows',
        'Client reporting',
        'Trading and order management',
        'Data feeds and API connectivity',
      ],
    },
  ].map((row) => ({ _type: 'profileField', _key: key(), ...row })),
  sponsorInterviews: [
    linkRow(
      'European Awards 2023: Sponsor Interview With Pierre Dupont From WIZE by TeamWork',
      `${WB_ARCHIVE}/197730/european-awards-2023-sponsor-interview-with-pierre-dupont-from-wize-by-teamwork`,
    ),
    linkRow(
      'Swiss EAM Awards 2023: Sponsor Interview With Pierre Dupont - WIZE by TeamWork',
      `${WB_ARCHIVE}/197590/swiss-eam-awards-2023-sponsor-interview-with-pierre-dupont-wize-by-teamwork`,
    ),
  ],
  awardsArchiveTitles: [
    "Wize By Teamwork's Central Application Supports Growth",
    'Portfolio Skills To Fore At Wize By Teamwork',
    "WIZE By Teamwork Raises External Asset Managers' Game",
    'Client Communications, Compliance Solutions Skills From WIZE',
    'Wize By Teamwork Wins EAM Platform, Offering',
  ],
  // The design has no targets ("#"); these are the matching pages on the company's own site.
  officialLinks: [
    linkRow('Explore WIZE customer success stories', 'https://www.wize.net/en/customers-success-stories'),
    linkRow('Contact WIZE', 'https://www.wize.net/en/contact'),
  ],
}

const DESCRIPTION = 'WIZE is the all-in-one Wealth & Asset management IT platform.'
const IMAGE_ALT = 'WIZE logo above a snow-capped mountain peak against a clear blue sky'

const ids = [PAGE_ID, COMPANY_ID]
// Drafts and release versions of either document (ids have no dots, so the last id segment is the published id).
const unpublished = await client.fetch(
  `*[_id in $drafts || (_id in path("versions.**") && string::split(_id, ".")[2] in $ids)]{ _id }`,
  { ids, drafts: ids.map((id) => `drafts.${id}`) },
  { perspective: 'raw' },
)

if (unpublished.length > 0) {
  console.error(`Stopping: unpublished copies exist: ${unpublished.map((doc) => doc._id).join(', ')}`)
  process.exit(1)
}

const [existingPage, company] = await Promise.all([
  client.fetch(`*[_id == $id][0]`, { id: PAGE_ID }, { perspective: 'raw' }),
  client.fetch(`*[_id == $id][0]`, { id: COMPANY_ID }, { perspective: 'raw' }),
])

if (!company || company._type !== 'company') {
  console.error(`Stopping: ${COMPANY_ID} is not a company document`)
  process.exit(1)
}

if (existingPage && existingPage._type !== 'partnerProfilePage') {
  console.error(`Stopping: ${PAGE_ID} exists with type ${existingPage._type}`)
  process.exit(1)
}

const setOnCompany = { ...companyFields }
const aboutEmpty = !Array.isArray(company.about) || company.about.length === 0

if (aboutEmpty) {
  setOnCompany.about = [block(DESCRIPTION)]
}

const overwritten = Object.keys(setOnCompany).filter((field) => company[field] != null && field !== 'about')

console.log(`${apply ? 'APPLY' : 'DRY RUN'} on ${projectId}/${dataset}\n`)
console.log(
  existingPage
    ? `1. ${PAGE_ID}: set ${Object.keys(page).length} fields (rev ${existingPage._rev})`
    : `1. ${PAGE_ID}: create (partnerProfilePage) with ${Object.keys(page).length} fields`,
)
console.log(
  `2. ${COMPANY_ID} "${company.title}" (slug ${company.slug?.current}, rev ${company._rev}): set ${Object.keys(setOnCompany).join(', ')}`,
)
console.log(aboutEmpty ? '   about: empty, set to the design description' : '   about: already filled, left as it is')
console.log(overwritten.length > 0 ? `   replaces existing values: ${overwritten.join(', ')}` : '   no existing profile values replaced')
console.log(
  imagePath
    ? `   profileImage: upload ${basename(imagePath)} on --apply, alt "${IMAGE_ALT}"`
    : '   profileImage: not set (pass --image=PATH with a local copy of wize-cover-1.jpg)',
)
console.log(`   kept: title "${company.title}", logo, websiteUrl ${company.websiteUrl ?? '(none)'}\n`)
console.log(JSON.stringify({ [PAGE_ID]: page, [COMPANY_ID]: setOnCompany }, null, 2))

if (!apply) {
  console.log('\nDry run: nothing written. Re-run with --apply after approval.')
  process.exit(0)
}

mkdirSync(BACKUPS, { recursive: true })
const backup = `${BACKUPS}/partner-profile-seed-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(backup, JSON.stringify({ [PAGE_ID]: existingPage ?? null, [COMPANY_ID]: company }, null, 2))
console.log(`\nBackup ${backup}`)

if (imagePath) {
  const asset = await client.assets.upload('image', createReadStream(imagePath), { filename: basename(imagePath) })
  setOnCompany.profileImage = { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt: IMAGE_ALT }
  console.log(`Uploaded ${asset._id}`)
}

const tx = client.transaction()

if (existingPage) {
  tx.patch(PAGE_ID, (patch) => patch.ifRevisionId(existingPage._rev).set(page))
} else {
  tx.create({ _id: PAGE_ID, _type: 'partnerProfilePage', ...page })
}

tx.patch(COMPANY_ID, (patch) => patch.ifRevisionId(company._rev).set(setOnCompany))

const result = await tx.commit()
console.log(`Done, transaction ${result.transactionId}`)
