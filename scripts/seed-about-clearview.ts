/**
 * One-off seed for the ClearView About page (design wb-g-about v1.1), DRY RUN by default.
 *
 * Creates the page document `page-about-clearview` (brand clearview, slug about) with five blocks: Hero over image,
 * Coverage list, Image with figure, Team and publications, Contact panel. The copy is the blocks' initial values (the
 * ClearView copy). The three photos are the design's assets: pass the folder that holds them with --assets=DIR; they
 * are uploaded as Sanity image assets on --apply only. The publication logos come from Brand settings, so nothing is
 * uploaded for them.
 *
 * Usage:
 *   bun --env-file=.env.local scripts/seed-about-clearview.ts --assets=DIR            # prints the plan, writes nothing
 *   bun --env-file=.env.local scripts/seed-about-clearview.ts --assets=DIR --apply    # uploads, then creates the page
 *
 * Only creates: stops when the page, a draft or a release version of it, or another ClearView page with the slug
 * "about" exists. `create` fails as well if the id was taken in between. Delete this script after use.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createClient } from '@sanity/client'

const PAGE_ID = 'page-about-clearview'
const CONTACT_PAGE_ID = 'page-contact-clearview'

const PHOTOS = {
  hero: {
    file: 'about-wb-team-3-plus.jpeg',
    alt: 'Two professionals working at desks in a dim office with green-tinted light',
    // The design places the photo at 58% across on mobile and centred elsewhere; from 1200 the card crops only
    // vertically, so the hotspot moves only the narrower layouts.
    hotspot: { x: 0.58, y: 0.5 },
  },
  record: {
    file: 'about-record-2a80c36c78f179a9.jpg',
    alt: 'Guests celebrating together at a ClearView industry event',
    hotspot: { x: 0.5, y: 0.5 },
  },
  team: {
    file: 'about-team-2.jpeg',
    alt: 'Members of the ClearView team standing together on a terrace',
    // The design's object-position: center 30%.
    hotspot: { x: 0.5, y: 0.3 },
  },
} as const

type PhotoKey = keyof typeof PHOTOS

const apply = process.argv.includes('--apply')
const assetsDir = process.argv.find((arg) => arg.startsWith('--assets='))?.slice('--assets='.length)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = apply ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN

if (!projectId || !dataset || !token) {
  console.error(
    `Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET or ${apply ? 'SANITY_API_WRITE_TOKEN' : 'SANITY_API_READ_TOKEN'}`,
  )
  process.exit(1)
}

if (!assetsDir) {
  console.error('Pass --assets=DIR, the folder with the design photos.')
  process.exit(1)
}

for (const photo of Object.values(PHOTOS)) {
  if (!existsSync(join(assetsDir, photo.file))) {
    console.error(`No file at ${join(assetsDir, photo.file)}`)
    process.exit(1)
  }
}

const client = createClient({ projectId, dataset, apiVersion: '2026-09-01', useCdn: false, token, perspective: 'raw' })

const key = () => randomUUID().replace(/-/g, '').slice(0, 12)
const heading = (text: string, level: string) => [
  { _type: 'block', _key: key(), style: level, markDefs: [], children: [{ _type: 'span', _key: key(), text, marks: [] }] },
]
// Rich-text copy (`paragraphsBlock`): one paragraph, no marks.
const paragraph = (text: string) => [
  { _type: 'block', _key: key(), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: key(), text, marks: [] }] },
]
const topic = (icon: string, title: string, description: string) => ({
  _type: 'coverageListItem',
  _key: key(),
  icon,
  title,
  description: paragraph(description),
})

// --- Checks ----------------------------------------------------------------------------------------------------------

const existing = await client.fetch<{ _id: string }[]>(
  `*[
    _id in [$id, $draft]
    || (_id in path("versions.**") && string::split(_id, ".")[2] == $id)
    || (_type == "page" && brand == "clearview" && slug.current == "about")
  ]{ _id }`,
  { id: PAGE_ID, draft: `drafts.${PAGE_ID}` },
)

if (existing.length > 0) {
  console.error(`Stopping: already exists: ${existing.map((doc) => doc._id).join(', ')}`)
  process.exit(1)
}

const contact = await client.fetch<{ _id: string; slug: string | null } | null>(
  `*[_id == $id][0]{ _id, "slug": slug.current }`,
  { id: CONTACT_PAGE_ID },
)

if (!contact || contact.slug !== 'contact') {
  console.error(`Stopping: ${CONTACT_PAGE_ID} (slug contact) not found; the Contact panel button points at it.`)
  process.exit(1)
}

// --- The page --------------------------------------------------------------------------------------------------------

type ImageValue = { _type: 'image'; asset: { _type: 'reference'; _ref: string }; alt: string; hotspot: object; crop: object }

const imageOf = (photo: PhotoKey, assetId: string): ImageValue => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: assetId },
  alt: PHOTOS[photo].alt,
  hotspot: { _type: 'sanity.imageHotspot', ...PHOTOS[photo].hotspot, width: 1, height: 1 },
  crop: { _type: 'sanity.imageCrop', top: 0, bottom: 0, left: 0, right: 0 },
})

const buildPage = (assets: Record<PhotoKey, string>) => ({
  _id: PAGE_ID,
  _type: 'page',
  brand: 'clearview',
  title: 'About',
  slug: { _type: 'slug', current: 'about' },
  blocks: [
    {
      _type: 'overlayHero',
      _key: key(),
      breadcrumbHomeLabel: 'Home',
      breadcrumbLabel: 'About',
      heading: heading('Connecting the global wealth management community', 'h1'),
      standfirst:
        'ClearView Financial Media brings news and analysis, research, awards and industry events to professionals across global wealth management.',
      image: imageOf('hero', assets.hero),
    },
    {
      _type: 'coverageList',
      _key: key(),
      heading: heading('A global view of wealth management', 'h2'),
      text: 'Through WealthBriefing, WealthBriefingAsia and Family Wealth Report, ClearView covers the key decisions and developments in private banking and wealth management.',
      listHeading: heading('Coverage includes', 'h3'),
      items: [
        topic(
          'pie-chart',
          'Strategy and business change',
          'Strategic and structural developments, business models, results and performance, mergers and acquisitions.',
        ),
        topic('cpu-chip', 'Technology and operations', 'Digital delivery, technology, cybersecurity and data management.'),
        topic('user', 'People and private wealth', 'Client expectations, people moves, families and family offices.'),
        topic(
          'bar-chart',
          'Investment and regulation',
          'Asset management and allocation, products, compliance, AML, KYC, suitability, tax, estate planning and legal issues.',
        ),
      ],
    },
    {
      _type: 'recordFeature',
      _key: key(),
      image: imageOf('record', assets.record),
      heading: heading('A record of the industry', 'h2'),
      text: paragraph(
        "ClearView runs regular research and industry events, including Breakfast Briefings, Summits and awards programmes. The group's archive reaches back to 2001.",
      ),
      figureValue: 'Almost 200,000',
      figureLabel: 'articles and news items in the archive',
    },
    {
      _type: 'teamNetwork',
      _key: key(),
      image: imageOf('team', assets.team),
      heading: heading('A wider network, an experienced team', 'h2'),
      body: paragraph(
        'WealthBriefing, WealthBriefingAsia and Family Wealth Report connect wealth professionals through ClearView’s news, research, awards and events. Group Editor Tom Burroughes leads coverage; Publisher Stephen Harris brings 30+ years’ City experience.',
      ),
      quote: paragraph('ClearView describes its mission as bringing the global wealth management industry together.'),
      quoteCaption: 'ClearView Financial Media',
    },
    {
      _type: 'cta',
      _key: key(),
      heading: heading('Ask the ClearView team anything', 'h2'),
      text: paragraph('Our team can help with membership, research, awards and event enquiries.'),
      link: {
        kind: 'internal',
        internal: { _type: 'reference', _ref: CONTACT_PAGE_ID },
        label: 'Get in touch',
      },
    },
  ],
})

if (!apply) {
  const placeholders = { hero: '(upload)', record: '(upload)', team: '(upload)' }
  console.log(JSON.stringify(buildPage(placeholders), null, 2))
  console.log(`\nDRY RUN. Would upload ${Object.keys(PHOTOS).length} images from ${assetsDir} and create ${PAGE_ID}.`)
  process.exit(0)
}

const assets = {} as Record<PhotoKey, string>

for (const [name, photo] of Object.entries(PHOTOS) as [PhotoKey, (typeof PHOTOS)[PhotoKey]][]) {
  // A Buffer, not a stream: a file stream body failed the upload under Bun.
  const asset = await client.assets.upload('image', readFileSync(join(assetsDir, photo.file)), {
    filename: photo.file,
  })
  assets[name] = asset._id
  console.log(`uploaded ${photo.file} -> ${asset._id}`)
}

const created = await client.create(buildPage(assets))
console.log(`created ${created._id} (rev ${created._rev})`)
