import { PlayIcon } from '@sanity/icons/Play'
import { VideoIcon } from '@sanity/icons/Video'
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
 *
 * The embed member exists for the Vimeo and Issuu iframes inside migrated
 * prose. It stores an identifier, never a URL or HTML, so the front end builds
 * the iframe from a fixed template per provider and nothing an editor types can
 * point it at another host.
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
    // A video file held in the media library, the counterpart of `image`. In
    // WordPress these were `[video mp4="..."]` shortcodes pointing at files in
    // wp-content/uploads: 4 in prose (23133, 26744, 29821, 29954).
    defineArrayMember({
      name: 'videoFile',
      title: 'Video file',
      type: 'file',
      icon: VideoIcon,
      options: { accept: 'video/*' },
      fields: [
        defineField({
          name: 'title',
          title: 'Title',
          type: 'string',
          description: 'Names the video for screen readers. Required once a file is attached.',
          validation: (Rule) =>
            Rule.custom((title, context) => {
              const parent = context.parent as { asset?: { _ref?: string } } | undefined
              if (parent?.asset?._ref && !title?.trim()) {
                return 'A video needs a title'
              }
              return true
            }),
        }),
      ],
      preview: {
        select: { title: 'title', filename: 'asset.originalFilename' },
        prepare({ title, filename }) {
          return { title: title || 'Video file', subtitle: filename }
        },
      },
    }),
    defineArrayMember({
      name: 'embed',
      title: 'Embed',
      type: 'object',
      icon: PlayIcon,
      fields: [
        defineField({
          name: 'provider',
          title: 'Provider',
          type: 'string',
          options: {
            list: [
              { title: 'Vimeo', value: 'vimeo' },
              { title: 'Issuu', value: 'issuu' },
            ],
            layout: 'radio',
          },
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'id',
          title: 'ID',
          type: 'string',
          description:
            'Vimeo: the numeric video id, for example 762229585, or showcase/6614946 for a showcase. Issuu: the 32-character pubId, for example 68c1ef3232d11826d464e0575ef51f0b, or {user}/{document} for older embeds, for example clearviewpublishing/fwrfintechreport2024.',
          validation: (Rule) =>
            Rule.required().custom((id, context) => {
              const { provider } = (context.parent ?? {}) as { provider?: string }

              if (!id || !provider) {
                return true
              }
              if (provider === 'vimeo' && !/^(?:showcase\/)?\d+$/.test(id)) {
                return 'A Vimeo id is digits only, or showcase/ followed by digits'
              }
              if (provider === 'issuu' && !/^(?:[0-9a-f]{32}|[\w.-]+\/[\w.-]+)$/.test(id)) {
                return 'An Issuu id is a 32-character pubId, or {user}/{document}'
              }

              return true
            }),
        }),
        defineField({
          name: 'hash',
          title: 'Vimeo privacy hash',
          type: 'string',
          description:
            'The h= value from an unlisted video link, for example 54e5b4c1c2. Unlisted videos do not play without it.',
          hidden: ({ parent }) => parent?.provider !== 'vimeo',
          validation: (Rule) => Rule.regex(/^[0-9a-f]+$/, { name: 'Vimeo privacy hash', invert: false }),
        }),
        defineField({
          name: 'caption',
          title: 'Caption',
          type: 'string',
        }),
      ],
      preview: {
        select: { provider: 'provider', id: 'id', caption: 'caption' },
        prepare({ provider, id, caption }) {
          return {
            title: caption || (provider === 'issuu' ? 'Issuu publication' : 'Vimeo video'),
            subtitle: id,
          }
        },
      },
    }),
  ],
})
