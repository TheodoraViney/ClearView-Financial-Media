import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { ShareIcon } from '@sanity/icons/Share'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isEditorialBrandKey } from '@/brands'
import { ARTICLE_PAGE_COPY_DEFAULTS, type ArticlePageCopy } from '@/lib/article-copy'
import { SHARE_LINK_DEFAULTS, SHARE_LINKS_MAX, shareTemplateError } from '@/lib/share-links'

/*
 * The article template's labels, one document per editorial brand with the fixed id
 * `articlePageDocumentId(key)` from `src/brands.ts`, opened from each brand folder in the Studio.
 * Screen-reader-only text stays in code.
 */

const brandKeyOf = (id: string | undefined): string =>
  String(id ?? '').replace(/^drafts\./, '').replace(/^article-page-/, '')

const label = (name: keyof ArticlePageCopy, title: string, options: { description?: string; fieldset?: string } = {}) =>
  defineField({
    name,
    title,
    type: 'string',
    description: options.description,
    fieldset: options.fieldset,
    initialValue: ARTICLE_PAGE_COPY_DEFAULTS[name],
    validation: (Rule) => Rule.required(),
  })

export const articlePage = defineType({
  name: 'articlePage',
  title: 'Article page',
  type: 'document',
  icon: DocumentTextIcon,
  // Fields follow the article page from top to bottom.
  fieldsets: [
    { name: 'byline', title: 'Byline and image', options: { columns: 2 } },
    { name: 'share', title: 'Share buttons', options: { columns: 2 } },
    { name: 'embed', title: 'Embedded players', options: { columns: 2 } },
  ],
  fields: [
    label('breadcrumbHomeLabel', 'Breadcrumb home label'),
    label('readTimeSuffix', 'Reading time suffix', { fieldset: 'byline', description: 'After the minutes: "3 min read".' }),
    label('imageCreditPrefix', 'Image credit prefix', { fieldset: 'byline', description: 'Before the credit: "Image: WealthBriefing".' }),
    // Share opens the device share menu; Link copied shows on the button for two seconds.
    label('shareLabel', 'Share button', { fieldset: 'share' }),
    label('copyLinkLabel', 'Copy link button', { fieldset: 'share' }),
    label('linkCopiedLabel', 'Link copied message', { fieldset: 'share' }),
    label('shareRailLabel', 'Share rail label', { fieldset: 'share' }),
    defineField({
      name: 'shareLinks',
      title: 'Share rail networks',
      type: 'array',
      description: 'The copy link button always follows them.',
      initialValue: SHARE_LINK_DEFAULTS.map(({ key, label, url }) => ({ _key: key, _type: 'shareLink', label, url })),
      validation: (Rule) => Rule.required().min(1).max(SHARE_LINKS_MAX),
      of: [
        defineArrayMember({
          name: 'shareLink',
          title: 'Network',
          type: 'object',
          icon: ShareIcon,
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Read by screen readers, e.g. "Share on LinkedIn".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'image',
              description: 'One colour on a transparent background, SVG preferred: only its shape is used.',
              options: { accept: 'image/svg+xml,image/png' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Share address',
              type: 'string',
              description: '{url} is replaced with the article address and {title} with its title.',
              validation: (Rule) => Rule.required().custom((value: string | undefined) => shareTemplateError(value) ?? true),
            }),
          ],
          preview: {
            select: { label: 'label', url: 'url', icon: 'icon' },
            prepare({ label, url, icon }) {
              return { title: label || 'No label', subtitle: url || 'No address', media: icon?.asset ? icon : ShareIcon }
            },
          },
        }),
      ],
    }),
    // The cookie button opens the cookie settings.
    label('embedConsentText', 'Cookie notice', {
      fieldset: 'embed',
      description: 'Shown instead of a video, podcast or Issuu player until the reader allows cookies.',
    }),
    label('embedConsentButton', 'Cookie button', { fieldset: 'embed' }),
    label('recommendedHeading', 'Recommended heading'),
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Article page — ${isEditorialBrandKey(key) ? BRANDS[key].title : key}`, media: DocumentTextIcon }
    },
  },
})
