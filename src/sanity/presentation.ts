import type { PluginOptions } from 'sanity'
import { defineDocuments, defineLocations, presentationTool } from 'sanity/presentation'

import { BRAND_KEYS, BRANDS, brandOrigin } from '@/brands'
import { COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID, isCompanyEngagementPageId } from '@/lib/company-engagement'
import { COMPANY_ENGAGEMENT_PATH, HOME_PAGE_SLUG } from '@/lib/links'
import { RESEARCH_SUMMARY_DEFAULT_SLUG } from '@/lib/research-report'
import { SHARED_LISTINGS_PAGE_DOCUMENT_ID } from '@/lib/shared-listings'

// An awards edition or a conference event: both are served at /events/{slug} on ClearView.
const eventLocations = defineLocations({
  select: { title: 'title', slug: 'slug.current' },
  resolve: (doc) =>
    doc?.slug ? { locations: [{ title: doc.title ?? 'Untitled', href: `/events/${doc.slug}` }] } : null,
})

// A research report: its page and its Executive Summary page (/resource/{slug}/{summarySlug}) on ClearView. The
// summary page exists only while it has content, but the location is always listed, so the editor can open it once it
// is filled.
const resourceLocations = defineLocations({
  select: { title: 'title', slug: 'slug.current', summarySlug: 'summarySlug.current' },
  resolve: (doc) =>
    doc?.slug
      ? {
          locations: [
            { title: doc.title ?? 'Untitled', href: `/resource/${doc.slug}` },
            {
              title: 'Executive Summary',
              href: `/resource/${doc.slug}/${encodeURIComponent(doc.summarySlug || RESEARCH_SUMMARY_DEFAULT_SLUG)}`,
            },
          ],
        }
      : null,
})

// A company's profile page on ClearView. The page exists only while an awards edition, an event or a post names the
// company (COMPANY_HAS_PROFILE); the location is listed for any company with a slug, so the editor can open it.
const companyLocations = defineLocations({
  select: { title: 'title', slug: 'slug.current' },
  resolve: (doc) =>
    doc?.slug
      ? { locations: [{ title: doc.title ?? 'Untitled', href: `/companies/${encodeURIComponent(doc.slug)}` }] }
      : null,
})

// The shared listings page's routes on ClearView: one `page` document with three tabs, never served at its slug.
// Summits, briefings and webinars all open the Events tab; bare /resource opens the Research tab.
const SHARED_LISTINGS_ROUTES = [
  { title: 'Awards', href: '/events-category/awards' },
  { title: 'Events', href: '/events-category/summits' },
  { title: 'Events (briefings)', href: '/events-category/briefings' },
  { title: 'Events (webinars)', href: '/events-category/webinar' },
  { title: 'Research', href: '/resource-categories/research' },
  { title: 'Research (/resource)', href: '/resource' },
]

export const presentationTools: PluginOptions[] = BRAND_KEYS.map((key) =>
  presentationTool({
    name: `preview-${key}`,
    title: BRANDS[key].title,
    previewUrl: {
      initial: brandOrigin(key),
      previewMode: {
        enable: '/api/draft-mode/enable',
      },
    },
    allowOrigins: BRAND_KEYS.map(brandOrigin),
    resolve: {
      mainDocuments: defineDocuments([
        {
          route: '/',
          filter: '_type == "page" && brand == $brand && slug.current == "home"',
          params: { brand: key },
        },
        {
          route: '/posts/:slug',
          filter: '_type == "post" && slug.current == $slug && $brand in brands',
          params: { brand: key },
        },
        // Award category pages live on ClearView only. Their copy (description, eligibility, recognition, judging) is
        // on the category itself, so the category is the document to edit.
        ...(key === 'clearview'
          ? [
              {
                route: '/awards/:programme/:category',
                filter: '_type == "awardCategory" && slug.current == $category',
              },
              // Awards editions and conference events share /events/{slug}; the slug is unique across both types.
              {
                route: '/events/:slug',
                filter: '_type in ["awardsProgramme", "conferenceEvent"] && slug.current == $slug',
              },
              // A research report, and its Executive Summary page at the report's summary slug: both are the report's
              // own fields.
              {
                route: '/resource/:slug',
                filter: '_type == "resource" && slug.current == $slug',
              },
              {
                route: '/resource/:slug/:summary',
                filter: `_type == "resource" && slug.current == $slug && $summary == coalesce(summarySlug.current, "${RESEARCH_SUMMARY_DEFAULT_SLUG}")`,
              },
              // The company directory: the cards are the records' own; the blocks are the Company Engagement page
              // document's.
              {
                route: COMPANY_ENGAGEMENT_PATH,
                filter: '_id == $id',
                params: { id: COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID },
              },
              // A company profile: the company's own fields. The labels are the Company page texts document's.
              {
                route: '/companies/:slug',
                filter: '_type == "company" && slug.current == $slug',
              },
              // The listing rows are the records' own; the blocks (hero, listing labels, sidebar) are the shared listings
              // page document's.
              ...SHARED_LISTINGS_ROUTES.map(({ href }) => ({
                route: href,
                filter: '_id == $id',
                params: { id: SHARED_LISTINGS_PAGE_DOCUMENT_ID },
              })),
            ]
          : []),
        {
          route: '/:slug',
          filter: '_type == "page" && brand == $brand && slug.current == $slug',
          params: { brand: key },
        },
      ]),
      locations: {
        // Awards editions, conference events, research reports and company profiles are shared records, served on
        // ClearView only.
        ...(key === 'clearview'
          ? {
              awardsProgramme: eventLocations,
              conferenceEvent: eventLocations,
              resource: resourceLocations,
              company: companyLocations,
            }
          : {}),
        page: defineLocations({
          select: {
            id: '_id',
            title: 'title',
            slug: 'slug.current',
            brand: 'brand',
          },
          resolve: (doc) => {
            if (doc?.brand !== key) {
              return null
            }

            if (doc.id?.replace(/^drafts\./, '') === SHARED_LISTINGS_PAGE_DOCUMENT_ID) {
              return { locations: SHARED_LISTINGS_ROUTES }
            }

            if (isCompanyEngagementPageId(doc.id)) {
              return { locations: [{ title: doc.title ?? 'Untitled', href: COMPANY_ENGAGEMENT_PATH }] }
            }

            return {
              locations: [
                {
                  title: doc?.title ?? 'Untitled',
                  href: doc?.slug === HOME_PAGE_SLUG ? '/' : `/${doc?.slug}`,
                },
              ],
            }
          },
        }),
        post: defineLocations({
          select: {
            title: 'title',
            slug: 'slug.current',
            brands: 'brands',
          },
          resolve: (doc) => {
            if (!doc?.brands?.includes(key)) {
              return null
            }

            return {
              locations: [
                {
                  title: doc?.title ?? 'Untitled',
                  href: `/posts/${doc?.slug}`,
                },
                {
                  title: 'Posts',
                  href: '/posts',
                },
              ],
            }
          },
        }),
      },
    },
  }),
)
