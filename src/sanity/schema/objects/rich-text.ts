import { defineArrayMember, defineField, defineType } from 'sanity'

import { altField } from '../fields'

/**
 * Portable Text used by every migrated prose field.
 *
 * The 18 wysiwyg fields on the WordPress Event are converted into this on
 * import. Raw HTML is not stored: the contract requires the records to be
 * editable in the CMS without a developer.
 *
 * The link annotation allowlists schemes. Without it a CMS-authored
 * `javascript:` href is stored XSS, one of the three live bugs in README
 * section 10.
 */
export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Heading 4', value: 'h4' },
        { title: 'Quote', value: 'blockquote' },
      ],
      marks: {
        annotations: [
          defineArrayMember({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                validation: (Rule) =>
                  Rule.required().uri({
                    scheme: ['http', 'https', 'mailto', 'tel'],
                  }),
              }),
              defineField({
                name: 'openInNewTab',
                title: 'Open in a new tab',
                type: 'boolean',
                initialValue: false,
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
  ],
})
