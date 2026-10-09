import 'server-only'

import { brandDocumentId, BRANDS, EDITORIAL_BRAND_KEYS, type BrandKey } from '@/brands'
import { client } from '@/sanity/client'
import { NEWSLETTER_SETTINGS_QUERY } from '@/sanity/queries'

import { subscribeWithDoubleOptIn, type BrevoAttributes } from './brevo'

type EditorialBrandKey = (typeof EDITORIAL_BRAND_KEYS)[number]

export const isEditorialBrand = (key: string): key is EditorialBrandKey =>
  (EDITORIAL_BRAND_KEYS as readonly string[]).includes(key)

// Uncached on purpose, not cachedSanity: that cache expires only when a visitor's browser runs <SanityLive>,
// and a form action renders no page, so a changed list id could keep sending readers to the old list.
// Subscribes are rare, so one direct API read each (no CDN, published only, no stega) costs nothing.
const settingsClient = client.withConfig({ useCdn: false, perspective: 'published', stega: false })

/** A publication's Brevo list and confirmation template from its Brand settings. Throws when either is missing. */
async function newsletterSettings(brand: EditorialBrandKey) {
  const settings = await settingsClient.fetch(
    NEWSLETTER_SETTINGS_QUERY,
    { brand, brandId: brandDocumentId(brand) },
    { cache: 'no-store' },
  )

  if (!settings?.brevoListId || !settings.confirmationTemplateId) {
    throw new Error(
      `Newsletter not configured for ${BRANDS[brand].title}: set the Brevo list id and confirmation template id in Brand settings → Newsletter.`,
    )
  }

  return { listId: settings.brevoListId, templateId: settings.confirmationTemplateId }
}

/**
 * Subscribes a reader to one publication's newsletter with double opt-in. The list and template come from the
 * publication's Brand settings in the CMS, never from the caller. Throws for ClearView, which has no newsletter.
 */
export async function subscribeToPublication({
  brand,
  email,
  attributes,
  redirectionUrl,
}: {
  brand: BrandKey
  email: string
  attributes?: BrevoAttributes
  redirectionUrl: string
}): Promise<void> {
  if (!isEditorialBrand(brand)) {
    throw new Error(`No newsletter for brand: ${brand}`)
  }

  const { listId, templateId } = await newsletterSettings(brand)

  await subscribeWithDoubleOptIn({ email, attributes, listIds: [listId], templateId, redirectionUrl })
}

/** The publication's Brevo list id. Exported for the dev upsert test only, which has no list of its own. */
export async function publicationListId(brand: EditorialBrandKey): Promise<number> {
  return (await newsletterSettings(brand)).listId
}
