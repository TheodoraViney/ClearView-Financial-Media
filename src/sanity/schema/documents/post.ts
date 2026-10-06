import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, EDITORIAL_BRAND_KEYS } from '@/brands'

import { imageField } from '../fields'

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
      description: 'Shown under the headline in the Home hero. About 120-200 characters reads best.',
      validation: (Rule) => Rule.max(200).warning('Longer than 200 characters; the hero will wrap onto more lines'),
    }),
    imageField('image', { required: true }),
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
