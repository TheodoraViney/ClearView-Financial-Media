import type { PluginOptions } from 'sanity'
import { defineDocuments, defineLocations, presentationTool } from 'sanity/presentation'

import { BRAND_KEYS, BRANDS, brandOrigin } from '@/brands'
import { HOME_PAGE_SLUG } from '@/lib/links'

// An awards edition or a conference event: both are served at /events/{slug} on ClearView.
const eventLocations = defineLocations({
  select: { title: 'title', slug: 'slug.current' },
  resolve: (doc) =>
    doc?.slug ? { locations: [{ title: doc.title ?? 'Untitled', href: `/events/${doc.slug}` }] } : null,
})

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
            ]
          : []),
        {
          route: '/:slug',
          filter: '_type == "page" && brand == $brand && slug.current == $slug',
          params: { brand: key },
        },
      ]),
      locations: {
        // Awards editions and conference events are shared records, served on ClearView only.
        ...(key === 'clearview' ? { awardsProgramme: eventLocations, conferenceEvent: eventLocations } : {}),
        page: defineLocations({
          select: {
            title: 'title',
            slug: 'slug.current',
            brand: 'brand',
          },
          resolve: (doc) => {
            if (doc?.brand !== key) {
              return null
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
