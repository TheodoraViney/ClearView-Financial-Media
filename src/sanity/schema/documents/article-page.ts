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

const label = (name: keyof ArticlePageCopy, title: string, description: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    initialValue: ARTICLE_PAGE_COPY_DEFAULTS[name],
    validation: (Rule) => Rule.required(),
  })

export const articlePage = defineType({
  name: 'articlePage',
  title: 'Article page',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    label('recommendedHeading', 'Recommended heading', 'Heading of the recommended articles under the article.'),
    label('breadcrumbHomeLabel', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.'),
    label('shareLabel', 'Share button', 'Button that opens the device share menu.'),
    label('copyLinkLabel', 'Copy link button', 'Button that copies the article link.'),
    label('linkCopiedLabel', 'Link copied message', 'Shown on the button for two seconds after copying.'),
    label('readTimeSuffix', 'Reading time suffix', 'Follows the minutes in the byline, for example "3 min read".'),
    label('imageCreditPrefix', 'Image credit prefix', 'Precedes the credit under the main image, for example "Image: WealthBriefing".'),
    label('shareRailLabel', 'Share rail label', 'Above the share icons beside the text.'),
    defineField({
      name: 'shareLinks',
      title: 'Share rail networks',
      type: 'array',
      description: `The networks in the share rail beside the text, in this order, 1 to ${SHARE_LINKS_MAX}. The copy link button always follows them.`,
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
              description: 'What screen readers announce for the icon, e.g. "Share on LinkedIn".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'image',
              description:
                'One-colour icon on a transparent background, SVG preferred. Only its shape is used: the colour comes from the page.',
              options: { accept: 'image/svg+xml,image/png' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Share address',
              type: 'string',
              description:
                'The network\'s share address, starting with https://. {url} is replaced with the article address and {title} with its title, e.g. https://www.linkedin.com/sharing/share-offsite/?url={url}',
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
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Article page — ${isEditorialBrandKey(key) ? BRANDS[key].title : key}`, media: DocumentTextIcon }
    },
  },
})
