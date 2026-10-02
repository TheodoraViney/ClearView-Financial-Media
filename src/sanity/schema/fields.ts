import { defineField } from 'sanity'

import { LINKABLE_TYPES, isAllowedLinkTarget } from '@/lib/links'

/**
 * Alternative text for an image.
 *
 * Required only once an asset is actually attached, so an empty image field
 * never blocks a save. Validation reads `context.parent` (the image object
 * itself) rather than `context.document`, so the same field works at any
 * nesting depth: a top-level image, a gallery member, a repeater row.
 *
 * WCAG 2.1 AA is a launch acceptance condition, see README section 7.
 */
export const altField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'Describes the image for screen readers and search engines.',
  validation: (Rule) =>
    Rule.custom((alt, context) => {
      const parent = context.parent as { asset?: { _ref?: string } } | undefined

      if (parent?.asset?._ref && !alt) {
        return 'Alternative text is required once an image is uploaded'
      }

      return true
    }),
})

/**
 * Countries observed on the 255 exported Event records, minus `AF`.
 *
 * `AF` is the first option of the legacy ACF select and sits on 179 records as
 * an unset default, not as data. The loader drops it. Extend this list when the
 * client confirms the regions they actually run events in.
 */
export const EVENT_COUNTRIES = [
  { title: 'United Arab Emirates', value: 'AE' },
  { title: 'Switzerland', value: 'CH' },
  { title: 'United Kingdom', value: 'GB' },
  { title: 'Jersey', value: 'JE' },
  { title: 'Saudi Arabia', value: 'SA' },
  { title: 'Singapore', value: 'SG' },
  { title: 'United States of America', value: 'US' },
]

/** `HH:mm` clock time, kept apart from the date exactly as the source stores it. */
export const timeField = (name: string, title: string, group?: string) =>
  defineField({
    name,
    title,
    type: 'string',
    group,
    description: '24-hour clock, for example 14:00.',
    validation: (Rule) =>
      Rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        name: 'time of day',
        invert: false,
      }),
  })

/** WordPress post id the document was migrated from. Idempotency handle for the loader. */
export const legacyWpIdField = defineField({
  name: 'legacyWpId',
  title: 'Legacy WordPress ID',
  type: 'number',
  readOnly: true,
  description: 'Source post id on clearviewpublishing.com. Set by the migration, do not edit.',
})

/**
 * Image with hotspot and the alt-text rule above.
 *
 * `required` makes the asset itself mandatory; alt text is always required
 * once an asset is attached.
 */
export const imageField = (
  name: string,
  options: { title?: string; description?: string; group?: string; required?: boolean } = {},
) =>
  defineField({
    name,
    title: options.title ?? 'Image',
    type: 'image',
    description: options.description,
    group: options.group,
    options: { hotspot: true },
    fields: [altField],
    validation: options.required ? (Rule) => Rule.required() : undefined,
  })

/**
 * Editor-facing name for a block, shown in Studio previews to tell similar
 * blocks apart, for example "Banner position 1". Never rendered on the site
 * and never projected by the page queries.
 */
export const adminLabelField = defineField({
  name: 'adminLabel',
  title: 'Label (CMS only)',
  type: 'string',
  description: 'Shown in the Studio only, to tell blocks apart. Not displayed on the site.',
})

type LinkKind = 'internal' | 'external'

/**
 * A link to a document in the dataset or to an allowlisted address.
 *
 * `internal` references a routable document and resolves to a path at render
 * time, so a renamed slug never leaves a stale href behind. `external` accepts
 * http(s), mailto, tel and site-relative paths only, the same rule the runtime
 * guard in `src/lib/links.ts` applies, because API writes skip this
 * validation.
 */
export const linkField = (
  options: {
    name?: string
    title?: string
    description?: string
    group?: string
    required?: boolean
    withLabel?: boolean
  } = {},
) => {
  const { name = 'link', title = 'Link', description, group, required = false, withLabel = true } =
    options
  const kindOf = (parent: unknown): LinkKind | undefined =>
    (parent as { kind?: LinkKind } | undefined)?.kind

  return defineField({
    name,
    title,
    type: 'object',
    description,
    group,
    options: { collapsible: false },
    fields: [
      defineField({
        name: 'kind',
        title: 'Link type',
        type: 'string',
        options: {
          list: [
            { title: 'Page or document', value: 'internal' },
            { title: 'Web address', value: 'external' },
          ],
          layout: 'radio',
          direction: 'horizontal',
        },
        initialValue: 'internal',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'internal',
        title: 'Document',
        type: 'reference',
        to: LINKABLE_TYPES.map((type) => ({ type })),
        hidden: ({ parent }) => kindOf(parent) !== 'internal',
        validation: (Rule) =>
          Rule.custom((value, context) => {
            if (required && kindOf(context.parent) === 'internal' && !value) {
              return 'Choose a document to link to'
            }

            return true
          }),
      }),
      defineField({
        name: 'external',
        title: 'Address',
        type: 'string',
        description: 'https://…, mailto:…, tel:… or a path on this site starting with /',
        hidden: ({ parent }) => kindOf(parent) !== 'external',
        validation: (Rule) =>
          Rule.custom((value, context) => {
            if (kindOf(context.parent) !== 'external') {
              return true
            }

            if (!value) {
              return required ? 'Enter an address' : true
            }

            return isAllowedLinkTarget(value.trim())
              ? true
              : 'Use https://, http://, mailto:, tel: or a path starting with a single /'
          }),
      }),
      ...(withLabel
        ? [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Link text. Leave empty to use the default for this block.',
            }),
          ]
        : []),
    ],
  })
}
