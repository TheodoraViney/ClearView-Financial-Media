import { defineField, defineType, type CurrentUser, type ValidationContext } from 'sanity'

import { brandDocumentId, EDITORIAL_BRAND_KEYS } from '@/brands'
import {
  AD_PAGE_TYPE_TITLES,
  AD_POSITION_KEYS,
  AD_POSITIONS,
  adSizesLabel,
  type AdPageType,
  type AdPosition,
  type AdvertisingValue,
  isAdUnitCode,
  positionShowsOn,
} from '@/lib/gam'
import { NEWSLETTER_BANNER_SLOTS, NEWSLETTER_BANNERS } from '@/lib/newsletter-banners'
import { NEWSLETTER_COPY_DEFAULTS, NEWSLETTER_TITLE_PLACEHOLDER } from '@/lib/newsletter-copy'
import { lookupAdUnit } from '@/sanity/ad-unit-lookup'
import { AdUnitCodeInput } from '@/sanity/components/ad-unit-code-input'
import { BrandColorsInput } from '@/sanity/components/brand-colors-input'
import { apiVersion } from '@/sanity/env'

import { brevoSenderField } from '../fields'
import { bannerFields } from '../newsletter-banner'

// Only the three publications send a newsletter and carry articles; ClearView's brand document has no Newsletter tab
// and no article banner. Matched on the fixed document id (the draft id carries a `drafts.` prefix).
const EDITORIAL_BRAND_IDS: string[] = EDITORIAL_BRAND_KEYS.map(brandDocumentId)
const isPublication = (id: string | undefined) => EDITORIAL_BRAND_IDS.includes((id ?? '').replace(/^drafts\./, ''))

// Required on the three publications only: a plain Rule.required() would also block ClearView, where the tab is hidden.
const requiredForNewsletter = (message: string) => (value: unknown, context: ValidationContext) =>
  value || !isPublication(context.document?._id) ? true : message

// Advertising is for administrators only. The Growth plan has no custom roles, so this checks the built-in role name;
// editors, contributors, developers and viewers never see the tab.
const isAdministrator = (user: Omit<CurrentUser, 'role'> | null | undefined) =>
  Boolean(user?.roles.some((role) => role.name === 'administrator'))

// Where each position sits, as the page templates place it.
const POSITION_DESCRIPTIONS: Record<AdPosition, string> = {
  top: 'Head of the main column, only on pages with a right column.',
  side: 'Top of the right column.',
  publications: 'Under the cards of the Publications block.',
  article: 'Between "Text before the banner" and "Text after the banner".',
  banner3: 'Home page: under the blocks above Banner 3. Other pages: in the Categories list, after the first row.',
  banner4: 'Home page, under the blocks between Banner 3 and Banner 4, when there are any.',
  awardsWinners: 'Inside the Awards Winners block in a sidebar.',
}

const PAGE_TYPE_NAMES: Record<AdPageType, string> = { home: 'the home page', other: 'other pages' }

/**
 * The Ad Manager check of a well-formed code (src/sanity/ad-unit-lookup.ts), or null when there is nothing to report
 * from it: no token, or a newer value in the field.
 */
const lookUp = async (value: string, context: ValidationContext) => {
  const token = context.getClient({ apiVersion }).config().token

  return token ? lookupAdUnit(value, token, `${context.document?._id}:${context.path?.join('.')}`) : null
}

const STATUS_NAMES = { INACTIVE: 'inactive', ARCHIVED: 'archived' } as const

/**
 * A position's unit code for one page type. A unit may show once per page (GAM leaves a second slot with the same
 * unit empty), so a code already used by another position for the same page type is an error.
 *
 * The code is also checked against Google Ad Manager: a code it does not know, or a unit without the position's
 * size, blocks publishing, since that banner would never fill. An inactive or archived unit, or a check that could not
 * run, is only a warning, so an Ad Manager outage never stops anyone publishing.
 */
const adUnitCodeField = (position: AdPosition, page: AdPageType) =>
  defineField({
    name: page,
    title: AD_PAGE_TYPE_TITLES[page],
    type: 'string',
    components: { input: AdUnitCodeInput },
    validation: (Rule) => [
      Rule.custom(async (value: string | undefined, context) => {
        if (!isAdUnitCode(value)) {
          return true
        }

        const lookup = await lookUp(value, context)
        const { width, height } = AD_POSITIONS[position]

        if (lookup?.status === 'missing') {
          return `Google Ad Manager has no ad unit with the code ${value}. Copy it from the Code column.`
        }

        return lookup?.status === 'found' && !lookup.unit.sizes.includes(`${width}x${height}`)
          ? `${lookup.unit.name} has no ${width} × ${height} size in Google Ad Manager, so this banner stays empty.`
          : true
      }),
      Rule.custom(async (value: string | undefined, context) => {
        if (!isAdUnitCode(value)) {
          return true
        }

        const lookup = await lookUp(value, context)

        if (lookup?.status === 'error') {
          return `Could not check the unit with Google Ad Manager: ${lookup.error}`
        }

        return lookup?.status === 'found' && lookup.unit.status !== 'ACTIVE'
          ? `${lookup.unit.name} is ${STATUS_NAMES[lookup.unit.status]} in Google Ad Manager, so this banner stays empty.`
          : true
      }).warning(),
      Rule.custom((value: string | undefined, context) => {
        if (!value) {
          return true
        }

        if (!isAdUnitCode(value)) {
          return 'Letters, digits, _ . and - only, as in Google Ad Manager'
        }

        const advertising = (context.document as { advertising?: AdvertisingValue } | undefined)?.advertising
        const clash = AD_POSITION_KEYS.find(
          (other) => other !== position && positionShowsOn(other, page) && advertising?.[other]?.[page] === value,
        )

        return clash
          ? `${AD_POSITIONS[clash].title} uses this unit on ${PAGE_TYPE_NAMES[page]} too. A unit shows once per page.`
          : true
      }),
    ]
  })

const emailCopy = (name: keyof typeof NEWSLETTER_COPY_DEFAULTS, title: string, description?: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    initialValue: NEWSLETTER_COPY_DEFAULTS[name],
  })

export const brand = defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',
  groups: [
    { name: 'brand', title: 'Brand', default: true },
    { name: 'newsletter', title: 'Newsletter', hidden: ({ document }) => !isPublication(document?._id) },
    { name: 'advertising', title: 'Advertising', hidden: ({ currentUser }) => !isAdministrator(currentUser) },
  ],
  fieldsets: [
    { name: 'identity', title: 'Name and key', options: { columns: 2 } },
    { name: 'site', title: 'Site', options: { columns: 2 } },
    { name: 'logos', title: 'Logos', options: { columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'brand',
      fieldset: 'identity',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'key',
      title: 'Key',
      type: 'slug',
      group: 'brand',
      fieldset: 'identity',
      readOnly: ({ document }) => Boolean(document?._createdAt),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'domain',
      title: 'Domain',
      type: 'string',
      group: 'brand',
      fieldset: 'site',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      group: 'brand',
      fieldset: 'site',
      options: {
        list: [
          { title: 'UK', value: 'uk' },
          { title: 'Asia', value: 'asia' },
          { title: 'US', value: 'us' },
          { title: 'Global', value: 'global' },
        ],
      },
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'brand',
      fieldset: 'logos',
      // Screen readers read the image's alt text from Media, or the brand title when it is empty.
      description: 'SVG.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerLogo',
      title: 'Footer logo',
      type: 'image',
      group: 'brand',
      fieldset: 'logos',
      description: 'SVG. Empty: uses the Logo.',
    }),
    // Display only: the input shows BRANDS[key].colors from src/brands.ts and never writes, so this stays empty.
    defineField({
      name: 'brandColors',
      title: 'Brand colours',
      type: 'string',
      group: 'brand',
      description: 'Set in code to match the design.',
      readOnly: true,
      components: { input: BrandColorsInput },
    }),
    defineField({
      name: 'newsletter',
      title: 'Newsletter',
      type: 'object',
      group: 'newsletter',
      hidden: ({ document }) => !isPublication(document?._id),
      fields: [
        brevoSenderField('sender', {
          title: 'Sender',
          description: 'Only active senders in Brevo → Senders appear.',
          requiredWhen: ({ document }) => isPublication(document?._id),
        }),
        defineField({
          name: 'articlesPerIssue',
          title: 'Articles per issue',
          type: 'number',
          description: 'How many of the latest articles a new issue starts with.',
          initialValue: 4,
          validation: (Rule) =>
            Rule.integer().min(1).max(20).custom(requiredForNewsletter('Required to start a newsletter issue')),
        }),
        ...NEWSLETTER_BANNER_SLOTS.map((slot) => {
          const { title, width, height, where } = NEWSLETTER_BANNERS[slot]

          return defineField({
            name: slot,
            title: `${title} (${width} × ${height})`,
            type: 'object',
            description: `Sponsor banner ${where} in every issue that does not set its own. Empty: no banner.`,
            options: { collapsible: true, collapsed: false },
            // Both or neither: a banner needs its image and its link.
            fields: bannerFields(slot, {
              required: (parent) => {
                const banner = parent as { image?: { asset?: unknown }; link?: string } | undefined

                return Boolean(banner?.image?.asset || banner?.link)
              },
            }),
          })
        }),
        defineField({
          name: 'copy',
          title: 'Email copy',
          type: 'object',
          description: 'An empty field hides its element in the email.',
          options: { collapsible: true, collapsed: true, columns: 2 },
          fields: [
            emailCopy('featuredLabel', 'Featured label'),
            emailCopy('readFullStory', 'Read full story button'),
            emailCopy('readMore', 'Read more link'),
            emailCopy('advertisementLabel', 'Advertisement label'),
            emailCopy('footerText', 'Footer text', `${NEWSLETTER_TITLE_PLACEHOLDER} is replaced with the publication title.`),
            emailCopy(
              'unsubscribe',
              'Unsubscribe link',
              `Every email carries this link; empty, it reads "${NEWSLETTER_COPY_DEFAULTS.unsubscribe}".`,
            ),
          ],
        }),
      ],
    }),
    // A fixed list: positions are placed by the page templates, so editors cannot add, remove or reorder them.
    defineField({
      name: 'advertising',
      title: 'Advertising',
      type: 'object',
      group: 'advertising',
      // Home page units show on the home page, other pages units everywhere else.
      description:
        'Codes from the Code column in Google Ad Manager → Inventory → Ad units, not the Name column. Empty: no banner.',
      hidden: ({ currentUser }) => !isAdministrator(currentUser),
      fields: AD_POSITION_KEYS.map((position) => {
        const { title, pages } = AD_POSITIONS[position]

        return defineField({
          name: position,
          title: `${title}, ${adSizesLabel(position)}`,
          type: 'object',
          description: POSITION_DESCRIPTIONS[position],
          hidden: position === 'article' ? ({ document }) => !isPublication(document?._id) : undefined,
          options: { columns: pages.length },
          fields: pages.map((page) => adUnitCodeField(position, page)),
        })
      }),
    }),
  ],
})
