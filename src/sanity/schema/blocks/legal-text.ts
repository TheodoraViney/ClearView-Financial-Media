import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { RemoveIcon } from '@sanity/icons/Remove'
import { ThListIcon } from '@sanity/icons/ThList'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { isAllowedLinkTarget } from '@/lib/links'

import { adminLabelField } from '../fields'

/**
 * A link on selected text in a legal page: http(s), mailto, tel, or a path on this site such as /cookie-policy.
 * The same allowlist as every CMS link (isAllowedLinkTarget); the renderer checks it again with safeHref.
 */
const legalLink = defineArrayMember({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'href',
      title: 'URL',
      type: 'url',
      description: 'A full address (https://…, mailto:…) or a path on this site, for example /cookie-policy.',
      validation: (Rule) =>
        Rule.required()
          .uri({ scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true })
          .custom((value) =>
            !value || isAllowedLinkTarget(value.trim())
              ? true
              : 'Use https://, mailto:, tel: or a path starting with a single /',
          ),
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in a new tab',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})

/** Paragraphs, H2–H5 (H2 and H3 make the table of contents), lists, bold, italic and links. */
const legalTextBlock = defineArrayMember({
  type: 'block',
  styles: [
    { title: 'Normal', value: 'normal' },
    { title: 'Heading 2', value: 'h2' },
    { title: 'Heading 3', value: 'h3' },
    { title: 'Heading 4', value: 'h4' },
    { title: 'Heading 5', value: 'h5' },
  ],
  lists: [
    { title: 'Bullet', value: 'bullet' },
    { title: 'Numbered', value: 'number' },
  ],
  marks: {
    decorators: [
      { title: 'Bold', value: 'strong' },
      { title: 'Italic', value: 'em' },
    ],
    annotations: [legalLink],
  },
})

/** The lead paragraphs under the title: bold, italic and links, no headings or lists. */
const legalIntroBlock = defineArrayMember({
  type: 'block',
  styles: [{ title: 'Normal', value: 'normal' }],
  lists: [],
  marks: {
    decorators: [
      { title: 'Bold', value: 'strong' },
      { title: 'Italic', value: 'em' },
    ],
    annotations: [legalLink],
  },
})

/** A rule between two parts of a document, with space above the heading that follows it. */
const legalDivider = defineArrayMember({
  name: 'divider',
  title: 'Divider',
  type: 'object',
  icon: RemoveIcon,
  // An object needs one field; the editor never fills it.
  fields: [
    defineField({
      name: 'note',
      title: 'Note (CMS only)',
      type: 'string',
      description: 'Optional. Not displayed on the site.',
    }),
  ],
  preview: {
    select: { note: 'note' },
    prepare({ note }) {
      return { title: 'Divider', subtitle: note }
    },
  },
})

/** Defined terms: each a term and its meaning, side by side from tablet. */
const legalDefinitions = defineArrayMember({
  name: 'definitions',
  title: 'Definitions',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'rows',
      title: 'Terms',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'definition',
          title: 'Term',
          type: 'object',
          fields: [
            defineField({
              name: 'term',
              title: 'Term',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'text',
              title: 'Meaning',
              type: 'text',
              rows: 3,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'term', subtitle: 'text' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { rows: 'rows' },
    prepare({ rows }) {
      const count = Array.isArray(rows) ? rows.length : 0
      return { title: 'Definitions', subtitle: `${count} ${count === 1 ? 'term' : 'terms'}` }
    },
  },
})

const recordLabel = (name: string, title: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    initialValue,
    validation: (Rule) => Rule.required(),
    fieldset: 'labels',
  })

const recordValue = (name: string, title: string, type: 'string' | 'text' = 'string') =>
  defineField({
    name,
    title,
    type,
    ...(type === 'text' ? { rows: 2 } : {}),
    description: 'Optional: leave empty where the cookie has no value.',
  })

/** A list of cookies, each shown as labelled rows (name, purpose, provider, service, country, type, expiry). */
const cookieRecords = defineArrayMember({
  name: 'cookieRecords',
  title: 'Cookie list',
  type: 'object',
  icon: ThListIcon,
  fieldsets: [{ name: 'labels', title: 'Row labels', options: { collapsible: true, collapsed: true } }],
  fields: [
    recordLabel('nameLabel', 'Name label', 'Name:'),
    recordLabel('purposeLabel', 'Purpose label', 'Purpose:'),
    recordLabel('providerLabel', 'Provider label', 'Provider:'),
    recordLabel('serviceLabel', 'Service label', 'Service:'),
    recordLabel('serviceLinkLabel', 'Service link label', 'View Service Privacy Policy'),
    recordLabel('countryLabel', 'Country label', 'Country:'),
    recordLabel('typeLabel', 'Type label', 'Type:'),
    recordLabel('expiresLabel', 'Expires label', 'Expires in:'),
    defineField({
      name: 'emptyValueLabel',
      title: 'Empty value text',
      type: 'string',
      description: 'Shown in grey in a row whose cookie has no value.',
      initialValue: '__________',
      validation: (Rule) => Rule.required(),
      fieldset: 'labels',
    }),
    defineField({
      name: 'records',
      title: 'Cookies',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'cookieRecord',
          title: 'Cookie',
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            recordValue('purpose', 'Purpose', 'text'),
            recordValue('provider', 'Provider'),
            recordValue('service', 'Service'),
            defineField({
              name: 'serviceUrl',
              title: 'Service privacy policy URL',
              type: 'url',
              description: 'Optional. Shown after the service as the service link label.',
              validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
            }),
            recordValue('country', 'Country'),
            recordValue('type', 'Type'),
            recordValue('expires', 'Expires in'),
          ],
          preview: { select: { title: 'name', subtitle: 'provider' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { records: 'records' },
    prepare({ records }) {
      const count = Array.isArray(records) ? records.length : 0
      return { title: 'Cookie list', subtitle: `${count} ${count === 1 ? 'cookie' : 'cookies'}` }
    },
  },
})

/**
 * A legal document page (privacy policy, terms, cookie policy): breadcrumb, H1, a table of contents built from the
 * body's H2 and H3 headings, and the text. The block owns the page's H1.
 */
export const legalText = defineType({
  name: 'legalText',
  title: 'Legal text',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'breadcrumbHomeLabel',
      title: 'Breadcrumb home label',
      type: 'string',
      description: 'First item of the breadcrumb, linking to the home page.',
      initialValue: 'Home',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'Breadcrumb current label',
      type: 'string',
      description: 'Last item of the breadcrumb: this page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The page heading (H1).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'array',
      description: 'Optional. Paragraphs under the title, above the table of contents.',
      of: [legalIntroBlock],
    }),
    defineField({
      name: 'tocLabel',
      title: 'Table of contents label',
      type: 'string',
      description: 'Above the list of headings, and on the button that opens it on smaller screens.',
      initialValue: 'On this page',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'array',
      description: 'Heading 2 and Heading 3 make the table of contents.',
      of: [legalTextBlock, legalDivider, legalDefinitions, cookieRecords],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', title: 'title' },
    prepare({ adminLabel, title }) {
      return { title: adminLabel || title || 'Legal text', subtitle: 'Legal text' }
    },
  },
})
