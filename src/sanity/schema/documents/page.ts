import { defineField, defineType } from 'sanity'

import { BRAND_KEYS, BRANDS } from '@/brands'

import { pageBlocksField } from '../blocks'

// The home page is the page with the slug "home". Its banners sit between three block lists; other pages have one.
const isHome = (document: unknown) =>
  (document as { slug?: { current?: string } } | undefined)?.slug?.current === 'home'
const notHome = ({ document }: { document?: unknown }) => !isHome(document)

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
})
