import { defineField, defineType } from 'sanity'

import { BRAND_KEYS, BRANDS } from '@/brands'

import { blocksField } from '../blocks'

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
    blocksField,
  ],
})
