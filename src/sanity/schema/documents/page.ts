import { defineField, defineType } from 'sanity'

import { BRAND_KEYS, BRANDS, isBrandKey } from '@/brands'
import { isCategoriesPageDocumentId } from '@/lib/categories'
import { isCompanyEngagementPageId } from '@/lib/company-engagement'
import { SHARED_LISTINGS_PAGE_DOCUMENT_ID } from '@/lib/shared-listings'

import { pageBlocksField } from '../blocks'

// The home page is the page with the slug "home". Its banners sit between three block lists; other pages have one.
const isHome = (document: unknown) =>
  (document as { slug?: { current?: string } } | undefined)?.slug?.current === 'home'
const notHome = ({ document }: { document?: unknown }) => !isHome(document)

// The Categories page (the articles list) is one page per editorial brand with the fixed id `page-categories-{brand}`,
// served at /categories by its own route, so its brand and slug are fixed. It is built from blocks like any page.
const isCategoriesPage = (document: unknown) => isCategoriesPageDocumentId((document as { _id?: string } | undefined)?._id)

// The shared listings page (ClearView's awards, events and research lists) is the page with the fixed id
// SHARED_LISTINGS_PAGE_DOCUMENT_ID and the slug "shared-listings". It is built from blocks like any page, but served only
// at /events-category/{awards,summits,briefings,webinar} and /resource-categories/research, never at /shared-listings,
// so its brand and slug are fixed.
const isSharedListingsPage = (document: unknown) =>
  String((document as { _id?: string } | undefined)?._id ?? '').replace(/^drafts\./, '') === SHARED_LISTINGS_PAGE_DOCUMENT_ID

// The Company Engagement page (ClearView's company directory) is the page with the fixed id
// COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID and the slug "company-engagement". It is built from blocks like any page, but
// served only at /companies, so its brand and slug are fixed.
const isCompanyEngagementPage = (document: unknown) => isCompanyEngagementPageId((document as { _id?: string } | undefined)?._id)

// Pages served by a route of their own, whose brand and slug the route relies on.
const isFixedPage = (document: unknown) =>
  isCategoriesPage(document) || isSharedListingsPage(document) || isCompanyEngagementPage(document)

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      options: {
        list: BRAND_KEYS.map((key) => ({
          title: BRANDS[key].title,
          value: key,
        })),
        layout: 'radio',
        direction: 'horizontal',
      },
      readOnly: ({ document }) => isFixedPage(document),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Fixed on the Categories page (served at /categories), the shared listings page (served at /events-category/… and /resource-categories/research) and the Company Engagement page (served at /companies).',
      readOnly: ({ document }) => isFixedPage(document),
      options: {
        source: 'title',
        isUnique: async (slug, context) => {
          const { document, getClient } = context
          const brand = document?.brand as string | undefined

          if (!brand) {
            return true
          }

          const client = getClient({ apiVersion: '2026-09-01' })
          const id = document?._id.replace(/^drafts\./, '')

          const params = {
            slug,
            brand,
            draft: `drafts.${id}`,
            published: id,
          }

          const query = `!defined(*[_type=="page" && slug.current==$slug && brand==$brand && !(_id in [$draft,$published])][0]._id)`

          return client.fetch(query, params)
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    // `blocks` keeps its name on the home page too, so its blocks above Banner 3 needed no move.
    pageBlocksField('blocks', {
      title: 'Blocks',
      description: 'On the home page: the blocks above Banner 3. Banners are placed by the page template.',
    }),
    pageBlocksField('blocksMiddle', {
      title: 'Blocks between Banner 3 and Banner 4',
      description: 'Home page only. Leave empty to show no Banner 4.',
      hidden: notHome,
    }),
    pageBlocksField('blocksBottom', {
      title: 'Blocks below Banner 4',
      description: 'Home page only.',
      hidden: notHome,
    }),
  ],
  // The brand and the address under the title, so the four "Contact" or "Privacy policy" pages tell apart in reference
  // pickers, lists and search.
  preview: {
    select: { title: 'title', brand: 'brand', slug: 'slug.current' },
    prepare({ title, brand, slug }) {
      const brandTitle = typeof brand === 'string' && isBrandKey(brand) ? BRANDS[brand].title : null
      const path = typeof slug === 'string' ? (slug === 'home' ? '/' : `/${slug}`) : null

      return {
        title: title || 'Untitled page',
        subtitle: [brandTitle ?? 'No brand', path].filter(Boolean).join(' · '),
      }
    },
  },
})
