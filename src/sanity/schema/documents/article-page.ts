import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineField, defineType } from 'sanity'

import { BRANDS, isEditorialBrandKey } from '@/brands'
import { ARTICLE_PAGE_COPY_DEFAULTS, type ArticlePageCopy } from '@/lib/article-copy'

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
    label('shareRailLabel', 'Share rail label', 'Above the LinkedIn, X and copy icons beside the text.'),
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Article page — ${isEditorialBrandKey(key) ? BRANDS[key].title : key}`, media: DocumentTextIcon }
    },
  },
})
