import { type Path, type ValidationContext, defineArrayMember, defineField } from 'sanity'

import { HEADING_LEVELS, type HeadingLevel, isHeadingLevel } from '@/lib/headings'
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

export { EVENT_COUNTRIES } from '@/lib/countries'

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

type LinkValue = { kind?: LinkKind; internal?: { _ref?: string }; external?: string; label?: string }

/** What `requiredWhen` gets: the document and the path of the link object itself. */
export type LinkRequiredContext = { document: ValidationContext['document']; path: Path }

/**
 * A link to a document in the dataset or to an allowlisted address.
 *
 * `internal` references a routable document and resolves to a path at render
 * time, so a renamed slug never leaves a stale href behind. `external` accepts
 * http(s), mailto, tel and site-relative paths only, the same rule the runtime
 * guard in `src/lib/links.ts` applies, because API writes skip this
 * validation.
 *
 * `required` makes the link and its target mandatory always; `requiredWhen`
 * does the same only while it returns true, for a link whose need depends on
 * another field, e.g. the block's source.
 *
 * An optional link left half-filled is an error ("… or clear the link"), but
 * only once the editor has acted on it: a label typed, or the type switched to
 * Web address. A new block gets `{ kind: 'internal' }` from the nested initial
 * values without anyone touching the link, and that alone must not block
 * publishing.
 */
export const linkField = (
  options: {
    name?: string
    title?: string
    description?: string
    group?: string
    required?: boolean
    /** Required, object and target, only while this returns true. Ignored when `required` is set. */
    requiredWhen?: (context: LinkRequiredContext) => boolean
    withLabel?: boolean
    /** The label has no default in this block, so the editor must type one. */
    labelRequired?: boolean
  } = {},
) => {
  const {
    name = 'link',
    title = 'Link',
    description,
    group,
    required = false,
    requiredWhen,
    withLabel = true,
    labelRequired = false,
  } = options
  const kindOf = (parent: unknown): LinkKind | undefined => (parent as LinkValue | undefined)?.kind

  // `path` is the link object's own path; a target sub-field passes its parent's.
  const isRequired = (document: ValidationContext['document'], path: Path | undefined) =>
    required || Boolean(requiredWhen && path && requiredWhen({ document, path }))
  const subFieldRequired = ({ document, path }: ValidationContext) => isRequired(document, path?.slice(0, -1))
  const hasLabel = (parent: unknown) => Boolean((parent as LinkValue | undefined)?.label?.trim())

  return defineField({
    name,
    title,
    type: 'object',
    description,
    group,
    options: { collapsible: false },
    validation: required
      ? (Rule) => Rule.required()
      : requiredWhen
        ? (Rule) =>
            Rule.custom((value, context) => (value || !isRequired(context.document, context.path) ? true : 'Required'))
        : undefined,
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
            if (kindOf(context.parent) !== 'internal' || value?._ref) {
              return true
            }

            if (subFieldRequired(context)) {
              return 'Choose a document to link to'
            }

            // Internal is the initial value, so only a typed label shows the editor started this link.
            return hasLabel(context.parent) ? 'Choose a document or clear the link' : true
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

            if (!value?.trim()) {
              // Web address is never the initial value: the editor chose it.
              return subFieldRequired(context) ? 'Enter an address' : 'Enter a URL or clear the link'
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
              description: labelRequired
                ? 'Link text.'
                : 'Link text. Leave empty to use the default for this block.',
              validation: labelRequired ? (Rule) => Rule.required() : undefined,
            }),
          ]
        : []),
    ],
  })
}

type HeadingBlockValue = {
  _type?: string
  style?: string
  children?: { text?: string }[]
}

/** Plain text of a heading field's first block, for Studio previews. */
export function headingText(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const block = value[0] as HeadingBlockValue | undefined
  const text = (block?.children ?? []).map((child) => child.text ?? '').join('').trim()

  return text || undefined
}

/**
 * A section heading typed into a block: Portable Text limited to one block
 * with a heading style, so the editor picks the HTML level and the component
 * sets the size. No marks, links, lists or inline objects. Document titles
 * stay plain strings and do not use this.
 *
 * Sanity always adds "Normal" to a custom style list and makes the first
 * style the editor default, so a new heading would start as Normal. The
 * field's initial value is therefore one empty block in `defaultLevel`, and
 * validation rejects any other style, for example text pasted as Normal.
 */
export const headingField = (
  name = 'heading',
  options: {
    title?: string
    defaultLevel: HeadingLevel
    required?: boolean
    description?: string
    group?: string
  },
) => {
  const { title = 'Heading', defaultLevel, required = false, group } = options
  const description =
    options.description ?? 'Choose the heading level in the style menu. The size on the page stays the same.'

  return defineField({
    name,
    title,
    type: 'array',
    description,
    group,
    of: [
      defineArrayMember({
        type: 'block',
        styles: HEADING_LEVELS.map((level) => ({ title: `Heading ${level.slice(1)}`, value: level })),
        lists: [],
        marks: { decorators: [], annotations: [] },
        of: [],
        // Enter and multi-line paste stay in the one block.
        options: { oneLine: true },
      }),
    ],
    initialValue: [
      {
        _type: 'block',
        style: defaultLevel,
        markDefs: [],
        children: [{ _type: 'span', _key: 'span', text: '', marks: [] }],
      },
    ],
    validation: (Rule) =>
      Rule.custom((value: unknown) => {
        const blocks = (Array.isArray(value) ? value : []) as HeadingBlockValue[]
        const filled = blocks.filter((block) =>
          (block.children ?? []).some((child) => (child.text ?? '').trim() !== ''),
        )

        if (filled.length === 0) {
          return required ? 'Enter a heading' : true
        }

        if (blocks.length > 1) {
          return 'Keep the heading to a single paragraph'
        }

        if (!isHeadingLevel(blocks[0].style)) {
          return 'Choose a heading level (Heading 1 to Heading 6) in the style menu'
        }

        return true
      }),
  })
}
