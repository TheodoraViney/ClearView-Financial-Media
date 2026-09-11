import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, EDITORIAL_BRAND_KEYS } from '@/brands'

export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'brands',
      title: 'Brands',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: EDITORIAL_BRAND_KEYS.map((key) => ({
          title: BRANDS[key].title,
          value: key,
        })),
        layout: 'grid',
      },
      validation: (Rule) => Rule.required().min(1).max(3).unique(),
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
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image' }),
      ],
    }),
  ],
})
