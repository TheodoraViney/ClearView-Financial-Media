import type { PluginOptions } from 'sanity'
import { defineDocuments, defineLocations, presentationTool } from 'sanity/presentation'

import { BRAND_KEYS, BRANDS, brandOrigin } from '@/brands'
import { HOME_PAGE_SLUG } from '@/lib/links'

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
        {
          route: '/:slug',
          filter: '_type == "page" && brand == $brand && slug.current == $slug',
          params: { brand: key },
        },
      ]),
      locations: {
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
