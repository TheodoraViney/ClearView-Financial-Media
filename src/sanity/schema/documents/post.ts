import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, EDITORIAL_BRAND_KEYS } from '@/brands'
import { PEOPLE_MOVES_CATEGORY_ID } from '@/lib/article-taxonomy'

import { imageField } from '../fields'

type RefValue = { _ref?: string } | undefined

type PostDocument = {
  _id?: string
  brands?: string[]
  category?: RefValue
  primaryTopic?: RefValue
}

const isPeopleMoves = (document: unknown) =>
  (document as PostDocument | undefined)?.category?._ref === PEOPLE_MOVES_CATEGORY_ID

const publishedId = (id: string | undefined) => String(id ?? '').replace(/^drafts\./, '')

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
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      description: 'The section of the site the article belongs to.',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'primaryTopic',
      title: 'Main topic',
      type: 'reference',
      to: [{ type: 'topic' }],
      description: 'The main subject of the article. Shown above the headline and in the breadcrumb.',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'secondaryTopics',
      title: 'Other topics',
      type: 'array',
      description: 'Up to three other subjects the article covers. Used by the topic filter on the articles list.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'topic' }],
          options: {
            disableNew: true,
            filter: ({ document }) => ({
              filter: '_id != $primary',
              params: { primary: (document as PostDocument | undefined)?.primaryTopic?._ref ?? '' },
            }),
          },
        }),
      ],
      validation: (Rule) =>
        Rule.max(3)
          .unique()
          .custom((value: RefValue[] | undefined, context) => {
            const primary = (context.document as PostDocument | undefined)?.primaryTopic?._ref

            return primary && value?.some((item) => item?._ref === primary)
              ? 'The main topic is already set above; remove it here'
              : true
          }),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'reference',
      to: [{ type: 'region' }],
      description: 'Where the move happened. People Moves only.',
      options: { disableNew: true },
      hidden: ({ document }) => !isPeopleMoves(document),
      validation: (Rule) =>
        Rule.custom((value: RefValue, context) => {
          const peopleMoves = isPeopleMoves(context.document)

          if (peopleMoves && !value?._ref) {
            return 'Choose the region of this move'
          }

          // The field is hidden for other categories, so a region left over from People Moves must be cleared here.
          return !peopleMoves && value?._ref ? 'Region applies to People Moves only — clear it' : true
        }),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Who wrote the article. Use Editorial Staff for unsigned pieces.',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Standfirst',
      type: 'text',
      description:
        'Shown under the headline on the article page and in the Home hero. About 120-200 characters reads best.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the hero will wrap onto more lines'),
      ],
    }),
    {
      ...imageField('image', {
        fields: [
          defineField({
            name: 'credit',
            title: 'Credit',
            type: 'string',
            description: 'Shown under the image as "Image: {credit}". Starts as the brand name.',
            validation: (Rule) => Rule.required(),
          }),
        ],
      }),
      // A new post starts with the credit filled, so the image object exists before an asset is chosen: check the asset.
      validation: (Rule) =>
        Rule.custom((value: { asset?: RefValue } | undefined) => (value?.asset?._ref ? true : 'Upload an image')),
    },
    defineField({
      name: 'sponsor',
      title: 'Sponsor',
      type: 'reference',
      to: [{ type: 'company' }],
      description:
        'Set only for sponsored content: the company that paid for this post. A post with a sponsor can appear in the "Sponsored content" block, which shows the company name, logo and a link to its profile.',
      options: { disableNew: true },
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'articleBody',
    }),
    defineField({
      name: 'recommended',
      title: 'Recommended articles',
      type: 'array',
      description:
        'Up to three articles shown under this one. Leave empty to show the latest articles of the same category.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: {
            disableNew: true,
            filter: ({ document }) => {
              const post = document as PostDocument | undefined

              return {
                filter: '!(_id in [$self, $draft]) && count(brands[@ in $brands]) > 0',
                params: {
                  self: publishedId(post?._id),
                  draft: `drafts.${publishedId(post?._id)}`,
                  brands: post?.brands ?? [],
                },
              }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.max(3)
          .unique()
          .custom((value: RefValue[] | undefined, context) => {
            const self = publishedId((context.document as PostDocument | undefined)?._id)

            return value?.some((item) => item?._ref === self) ? 'An article cannot recommend itself' : true
          }),
    }),
  ],
})
