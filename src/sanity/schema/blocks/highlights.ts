import { CalendarIcon } from '@sanity/icons/Calendar'
import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { SparklesIcon } from '@sanity/icons/Sparkles'
import { StarIcon } from '@sanity/icons/Star'
import {
  type Path,
  type ReferenceFilterResolver,
  type ValidationContext,
  defineArrayMember,
  defineField,
  defineType,
  getValueAtPath,
} from 'sanity'

import { adminLabelField, headingField, headingText, imageField, linkField } from '../fields'

export const HIGHLIGHTS_ITEM_MAX = 3

export const HIGHLIGHTS_SOURCES = [
  { value: 'awards', title: 'Awards', type: 'awardsProgramme', icon: StarIcon },
  { value: 'events', title: 'Summits & events', type: 'conferenceEvent', icon: CalendarIcon },
  { value: 'research', title: 'Research', type: 'resource', icon: DocumentPdfIcon },
] as const

export type HighlightsSource = (typeof HIGHLIGHTS_SOURCES)[number]['value']

const sourceOf = (value: unknown) => HIGHLIGHTS_SOURCES.find((source) => source.value === value)

// Research is a resource category; other resource categories never show here.
const RESEARCH_FILTER = '_type == "resource" && category == "research"'

const filterFor = (source: unknown) => {
  const match = sourceOf(source)

  if (!match) {
    return '_type in ["awardsProgramme", "conferenceEvent", "resource"]'
  }

  return match.value === 'research' ? RESEARCH_FILTER : `_type == "${match.type}"`
}

/** The highlights block holding the value at `path`, `levels` segments up. */
const blockSourceAt = (document: unknown, path: Path, levels: number): unknown =>
  (getValueAtPath(document, path.slice(0, -levels)) as { source?: unknown } | undefined)?.source

// An array member reference: parentPath ends at `items`, one level below the block.
const itemsOfSource: ReferenceFilterResolver = ({ document, parentPath }) => ({
  filter: filterFor(blockSourceAt(document, parentPath, 1)),
})

type Ref = { _ref?: string }

/**
 * A Research promo with a report picked takes its title and cover from the
 * report, so its own title and image become optional overrides. A resource left
 * behind after the source changed does not count: the field is hidden then.
 */
const promoUsesReport = ({ document, parent, path }: ValidationContext) =>
  Boolean((parent as { resource?: Ref } | undefined)?.resource?._ref) &&
  // path ends at promo.<field>, two levels below the block.
  path !== undefined &&
  blockSourceAt(document, path, 2) === 'research'
type Picked = { _id: string; _type: string; title?: string; category?: string }

/**
 * Three instances sit in the Two columns sidebar: Awards, Summits & events and
 * Research. The source picks the records and the layout; the surface and the
 * icon come from code. Picks come first and the page query fills the empty
 * places.
 */
export const highlights = defineType({
  name: 'highlights',
  title: 'Highlights',
  type: 'object',
  icon: SparklesIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description:
        'Which records the block shows (awards editions, summits and events, or research) and how it looks.',
      options: {
        list: HIGHLIGHTS_SOURCES.map(({ value, title }) => ({ value, title })),
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    defineField({
      name: 'items',
      title: 'Picks',
      type: 'array',
      description: `Pick up to ${HIGHLIGHTS_ITEM_MAX}. Empty places show the next ones automatically.`,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'awardsProgramme' }, { type: 'conferenceEvent' }, { type: 'resource' }],
          options: { filter: itemsOfSource, disableNew: true },
        }),
      ],
      validation: (Rule) =>
        Rule.max(HIGHLIGHTS_ITEM_MAX)
          .unique()
          .custom(async (items, context) => {
            const source = sourceOf((context.parent as { source?: unknown } | undefined)?.source)
            const ids = ((items as Ref[] | undefined) ?? []).flatMap((ref) => (ref._ref ? [ref._ref] : []))

            if (!source || ids.length === 0) {
              return true
            }

            const picked = await context
              .getClient({ apiVersion: '2026-09-01' })
              .fetch<Picked[]>('*[_id in $ids]{ _id, _type, title, category }', { ids })

            for (const doc of picked) {
              const name = doc.title || doc._id
              const docSource = HIGHLIGHTS_SOURCES.find((entry) => entry.type === doc._type)

              if (doc._type !== source.type) {
                return `"${name}" is ${docSource?.title ?? doc._type}, but this block shows ${source.title}`
              }

              if (source.value === 'research' && doc.category !== 'research') {
                return `"${name}" is not in the Research category`
              }
            }

            return true
          }),
    }),
    defineField({
      name: 'deadlineLabel',
      title: 'Deadline label',
      type: 'string',
      description: 'Shown before the nominations deadline, e.g. "Entry deadline:". Leave empty to show the date only.',
      initialValue: 'Entry deadline:',
      hidden: ({ parent }) => (parent as { source?: unknown } | undefined)?.source !== 'awards',
    }),
    linkField({
      name: 'button',
      title: 'Button',
      description: 'The "View all …" button under the list.',
      required: true,
      labelRequired: true,
    }),
    defineField({
      name: 'promo',
      title: 'Promo',
      type: 'object',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: 'resource',
          title: 'Resource',
          type: 'reference',
          to: [{ type: 'resource' }],
          description: 'The report this promo points at. Its title, cover and download button are used unless the fields below override them.',
          options: { filter: RESEARCH_FILTER, disableNew: true },
          // path ends at promo.resource, two levels below the block.
          hidden: ({ document, path }) => blockSourceAt(document, path, 2) !== 'research',
        }),
        defineField({
          name: 'title',
          title: 'Title',
          type: 'string',
          description: 'For Research with a report picked: leave empty to use the report title.',
          validation: (Rule) =>
            Rule.custom((value, context) =>
              value?.trim() || promoUsesReport(context) ? true : 'Required unless a Research report is picked',
            ),
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 3,
          validation: (Rule) =>
            Rule.max(120).warning('Longer than 120 characters; the promo will wrap onto more lines'),
        }),
        defineField({
          ...imageField('image', {
            description: 'For Research with a report picked: leave empty to use the report cover.',
          }),
          validation: (Rule) =>
            Rule.custom((value, context) =>
              value?.asset || promoUsesReport(context) ? true : 'Required unless a Research report is picked',
            ),
        }),
        linkField({ name: 'link', title: 'Link' }),
      ],
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', source: 'source', items: 'items' },
    prepare({ adminLabel, heading, source, items }) {
      const match = sourceOf(source)
      const count = Array.isArray(items) ? items.length : 0

      return {
        title: adminLabel || headingText(heading) || match?.title || 'Highlights',
        subtitle: `Highlights · ${match?.title ?? 'No source'} · ${count} ${count === 1 ? 'pick' : 'picks'}`,
        media: match?.icon ?? SparklesIcon,
      }
    },
  },
})
