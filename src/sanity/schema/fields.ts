import { defineField } from 'sanity'

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
