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
import { NEWSLETTER_COPY_DEFAULTS, NEWSLETTER_TITLE_PLACEHOLDER } from '@/lib/newsletter-copy'
import { lookupAdUnit } from '@/sanity/ad-unit-lookup'
import { AdUnitCodeInput } from '@/sanity/components/ad-unit-code-input'
import { BrandColorsInput } from '@/sanity/components/brand-colors-input'
import { apiVersion } from '@/sanity/env'

import { brevoSenderField } from '../fields'

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
  top: 'At the head of the main column, on pages with a right column. Pages without one carry no Top banner.',
  side: 'At the top of the right column, on pages that have one.',
  publications: 'Under the cards of the Publications block, wherever that block is placed.',
  article: 'In the article text, between "Text before the banner" and "Text after the banner".',
  banner3: 'Home page, under the blocks above Banner 3. Other pages: in the Categories list, after the first row of cards.',
  banner4: 'Home page, under the blocks between Banner 3 and Banner 4. Not shown while that list is empty.',
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
    description:
      'The Code column in Google Ad Manager → Inventory → Ad units, e.g. WB_Leaderboard_Homepage_Only. Not the Name column. Empty: not shown on the live site.',
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

const emailCopy = (name: keyof typeof NEWSLETTER_COPY_DEFAULTS, title: string, description: string) =>
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
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'brand',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'key',
      title: 'Key',
      type: 'slug',
      group: 'brand',
      readOnly: ({ document }) => Boolean(document?._createdAt),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'domain',
      title: 'Domain',
      type: 'string',
      group: 'brand',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      group: 'brand',
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
      description: 'SVG. Screen readers read the image\'s alt text from Media, or the brand title when it is empty.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerLogo',
      title: 'Footer logo',
      type: 'image',
      group: 'brand',
      description: 'SVG. Only when the footer shows a different lockup from the header; empty uses the Logo above.',
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
          description:
            'Who the newsletter comes from: the name and address readers see. Only active senders in Brevo → Senders appear.',
          requiredWhen: ({ document }) => isPublication(document?._id),
        }),
        defineField({
          name: 'articlesPerIssue',
          title: 'Articles per issue',
          type: 'number',
          description:
            'How many of the latest articles a new issue starts with.',
          initialValue: 4,
          validation: (Rule) =>
            Rule.integer().min(1).max(20).custom(requiredForNewsletter('Required to start a newsletter issue')),
        }),
        defineField({
          name: 'copy',
          title: 'Email copy',
          type: 'object',
          description: 'Labels and footer text of every newsletter email. An empty field hides its element.',
          options: { collapsible: true, collapsed: true },
          fields: [
            emailCopy('featuredLabel', 'Featured label', 'Small label above the first article. Leave empty to hide it.'),
            emailCopy('readFullStory', 'Read full story button', 'Button under the first article. Leave empty to hide it.'),
            emailCopy(
              'readMore',
              'Read more link',
              'Link under every other article. Leave empty to hide it; the headline still links to the article.',
            ),
            emailCopy(
              'footerText',
              'Footer text',
              `Why the reader gets this email. ${NEWSLETTER_TITLE_PLACEHOLDER} is replaced with the publication title. Leave empty to hide it.`,
            ),
            emailCopy(
              'unsubscribe',
              'Unsubscribe link',
              `Text of the unsubscribe link in the footer. Every email carries this link; left empty, it reads "${NEWSLETTER_COPY_DEFAULTS.unsubscribe}".`,
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
      description:
        'Google Ad Manager units for the fixed banner positions. Home page units show on the home page, other pages units everywhere else.',
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
