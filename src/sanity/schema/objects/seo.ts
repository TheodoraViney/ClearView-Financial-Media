import { SearchIcon } from '@sanity/icons/Search'
import { type ImageRule, type StringRule, type TextRule, type ValidationContext, defineField, defineType } from 'sanity'

import { type BrandKey, brandDocumentId, isBrandKey } from '@/brands'
import { apiVersion } from '@/sanity/env'

import { altField } from '../fields'

/** Soft limits: search engines cut longer titles and descriptions, and often replace very short descriptions. */
export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 160
export const SEO_DESCRIPTION_MIN = 70

// The site cuts every share image to 1200×630 around the hotspot.
const SHARE_WIDTH = 1200
const SHARE_HEIGHT = 630
const SHARE_RATIO_TOLERANCE = 0.15
const SHARE_MAX_BYTES = 600 * 1024

type ImageValue = { asset?: { _ref?: string } } | undefined

type AssetInfo = { mimeType?: string; size?: number; metadata?: { dimensions?: { width?: number; height?: number } } }

// An uploaded asset never changes, so one fetch per asset serves both rules and every later validation run.
const assetInfo = new Map<string, Promise<AssetInfo | null>>()

const fetchAsset = (ref: string, context: ValidationContext) => {
  let info = assetInfo.get(ref)

  if (!info) {
    info = context
      .getClient({ apiVersion })
      .fetch<AssetInfo | null>('*[_id == $ref][0]{mimeType, size, metadata{dimensions}}', { ref })
      .catch(() => {
        assetInfo.delete(ref)

        return null
      })
    assetInfo.set(ref, info)
  }

  return info
}

/** Meta description warnings for when search engines are likely to cut or replace it. */
export const metaDescriptionWarnings = (Rule: TextRule) => [
  Rule.max(SEO_DESCRIPTION_MAX).warning(
    `Search results may cut descriptions longer than about ${SEO_DESCRIPTION_MAX} characters.`,
  ),
  Rule.min(SEO_DESCRIPTION_MIN).warning('Short descriptions are often replaced by search engines.'),
]

// The brand a document's title is shown under: a page's brand, a post's first brand (its canonical host), and
// ClearView for the records only ClearView serves.
const titleBrand = (document: ValidationContext['document']) => {
  const key =
    document?._type === 'page'
      ? document.brand
      : document?._type === 'post'
        ? (document.brands as unknown[] | undefined)?.[0]
        : 'clearview'

  return typeof key === 'string' && isBrandKey(key) ? key : null
}

// One fetch per brand while it has a name; an empty or failed one is fetched again on the next run.
const siteNames = new Map<BrandKey, Promise<string | null>>()

const fetchSiteName = (key: BrandKey, context: ValidationContext) => {
  let name = siteNames.get(key)

  if (!name) {
    name = context
      .getClient({ apiVersion })
      .fetch<string | null>('*[_id == $id][0].seoSiteName', { id: brandDocumentId(key) })
      .catch(() => null)
      .then((value) => {
        if (!value) {
          siteNames.delete(key)
        }

        return value
      })
    siteNames.set(key, name)
  }

  return name
}

/** Meta title: required, with a warning when it and the " | {name in titles}" the site adds pass SEO_TITLE_MAX. */
const metaTitleValidation = (Rule: StringRule) => [
  Rule.required(),
  Rule.custom(async (value: string | undefined, context) => {
    if (!value) {
      return true
    }

    const key = titleBrand(context.document)
    const name = key ? await fetchSiteName(key, context) : null
    const length = value.length + (name ? ` | ${name}`.length : 0)

    if (length <= SEO_TITLE_MAX) {
      return true
    }

    return name
      ? `Search results may cut titles longer than about ${SEO_TITLE_MAX} characters; with " | ${name}" this one is ${length}.`
      : `Search results may cut titles longer than about ${SEO_TITLE_MAX} characters.`
  }).warning(),
]

/**
 * A share (Open Graph) image with alt text. An SVG is an error, social apps do not show it. A heavy, small or
 * off-shape image is only a warning, because the site cuts it to 1200×630 around the hotspot anyway.
 */
export const shareImageField = (options: {
  name: string
  title: string
  group?: string
  fieldset?: string
  required?: boolean
}) =>
  defineField({
    name: options.name,
    title: options.title,
    type: 'image',
    group: options.group,
    fieldset: options.fieldset,
    description: `Cut to ${SHARE_WIDTH}×${SHARE_HEIGHT} around the hotspot.`,
    options: { hotspot: true },
    fields: [altField],
    validation: (Rule: ImageRule) => [
      Rule.custom(async (value: ImageValue, context) => {
        const ref = value?.asset?._ref

        if (!ref) {
          return options.required ? 'Upload a share image' : true
        }

        const asset = await fetchAsset(ref, context)

        return asset?.mimeType === 'image/svg+xml' ? 'Share previews do not show SVG; upload a JPG or PNG' : true
      }),
      Rule.custom(async (value: ImageValue, context) => {
        const ref = value?.asset?._ref
        const asset = ref ? await fetchAsset(ref, context) : null

        if (!asset || asset.mimeType === 'image/svg+xml') {
          return true
        }

        const warnings: string[] = []
        const { width, height } = asset.metadata?.dimensions ?? {}

        if (asset.size && asset.size > SHARE_MAX_BYTES) {
          warnings.push('Some apps skip share images over 600 KB.')
        }

        if (width && height) {
          const offShape = Math.abs(width / height / (SHARE_WIDTH / SHARE_HEIGHT) - 1) > SHARE_RATIO_TOLERANCE

          if (width < SHARE_WIDTH || offShape) {
            warnings.push(
              `Best at ${SHARE_WIDTH}×${SHARE_HEIGHT} or larger in that shape; this one is ${width}×${height}.`,
            )
          }
        }

        return warnings.length > 0 ? warnings.join(' ') : true
      }).warning(),
    ],
  })

/**
 * A page's search and share metadata. The site adds " | {name in titles}" of the brand to the title. An empty
 * description or image falls back to the record's own content, then to the brand's defaults.
 */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  icon: SearchIcon,
  options: { collapsible: false },
  fields: [
    defineField({
      name: 'title',
      title: 'Meta title',
      type: 'string',
      description: 'The site adds the brand name after it.',
      validation: metaTitleValidation,
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      validation: metaDescriptionWarnings,
    }),
    shareImageField({ name: 'image', title: 'Share image' }),
    defineField({
      name: 'canonical',
      title: 'Canonical URL',
      type: 'url',
      description: 'Leave empty to use this page’s own address.',
      validation: (Rule) => Rule.uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})

/**
 * The `seo` field of a routable document, in its SEO tab. Required as a whole: Sanity checks an object's required
 * fields only once the object exists.
 */
export const seoField = (options: { name?: string; title?: string; group?: string } = {}) =>
  defineField({
    name: options.name ?? 'seo',
    title: options.title ?? 'SEO',
    type: 'seo',
    group: options.group ?? 'seo',
    validation: (Rule) => Rule.required(),
  })
