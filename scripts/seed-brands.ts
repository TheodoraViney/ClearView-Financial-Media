import { createClient } from 'next-sanity'
import { BRAND_KEYS, BRANDS, brandDocumentId } from '@/brands'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_WRITE_TOKEN

if (!token) {
  console.error('Missing SANITY_API_WRITE_TOKEN. Set it in .env.local before seeding.')
  process.exit(1)
}

if (!projectId || !dataset) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET. Set them in .env.local before seeding.')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-09-01',
  useCdn: false,
  token,
})

async function seed() {
  const transaction = client.transaction()

  for (const key of BRAND_KEYS) {
    const brand = BRANDS[key]
    const id = brandDocumentId(key)

    transaction.createIfNotExists({
      _id: id,
      _type: 'brand',
      title: brand.title,
      key: { _type: 'slug', current: key },
      domain: brand.domain,
      region: brand.region,
      brandColor: brand.brandColor,
    })

    console.log(`brand.${key} -> ${id}`)
  }

  await transaction.commit()
  console.log(`Seeded ${BRAND_KEYS.length} brand documents.`)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
