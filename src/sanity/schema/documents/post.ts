import { defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, EDITORIAL_BRAND_KEYS, type EditorialBrandKey, isEditorialBrandKey } from '@/brands'
import { BRIEF_MAX_CHARS, BRIEF_TARGET_MIN_CHARS } from '@/lib/brief-prompt'

import { BriefTextInput } from '@/sanity/components/brief-text-input'

import { imageField } from '../fields'

type RefValue = { _ref?: string } | undefined

type PostDocument = {
  _id?: string
  brands?: string[]
  primaryTopic?: RefValue
}

const publishedId = (id: string | undefined) => String(id ?? '').replace(/^drafts\./, '')

export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fieldsets: [
    { name: 'filing', title: 'Category and region', options: { columns: 2 } },
    { name: 'partner', title: 'Sponsored or contributed', options: { columns: 2 } },
  ],
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
      fieldset: 'filing',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'reference',
      to: [{ type: 'region' }],
      fieldset: 'filing',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'primaryTopic',
      title: 'Main topic',
      type: 'reference',
      to: [{ type: 'topic' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'secondaryTopics',
      title: 'Other topics',
      type: 'array',
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
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Use Editorial Staff for unsigned pieces.',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Standfirst',
      type: 'text',
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
            description: 'Shown as "Image: {credit}". Starts as the brand name.',
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
      fieldset: 'partner',
      description: 'Only for sponsored content. Lets the post appear in the Sponsored content block.',
      options: { disableNew: true },
    }),
    defineField({
      name: 'contributor',
      title: 'Contributor (guest)',
      type: 'reference',
      to: [{ type: 'company' }],
      fieldset: 'partner',
      description: 'The company of the guest author.',
      options: { disableNew: true },
    }),
    // The article banner sits between the two text fields, fixed by the template. `content` keeps its name from
    // before the split, so stored bodies need no move.
    defineField({
      name: 'content',
      title: 'Text before the banner',
      type: 'articleBody',
    }),
    defineField({
      name: 'contentAfter',
      title: 'Text after the banner',
      type: 'articleBody',
      description: 'Empty: the banner shows after the text.',
    }),
    defineField({
      name: 'briefText',
      title: 'Brief',
      type: 'text',
      rows: 5,
      description: `Shown in News in Brief, about ${BRIEF_TARGET_MIN_CHARS}–${BRIEF_MAX_CHARS} characters. Write it or use Generate brief; empty shows the standfirst.`,
      components: { input: BriefTextInput },
      validation: (Rule) =>
        Rule.max(BRIEF_MAX_CHARS).warning(
          `News in Brief shows three lines, about ${BRIEF_MAX_CHARS} characters; a longer brief is cut with an ellipsis`,
        ),
    }),
    defineField({
      name: 'recommended',
      title: 'Recommended articles',
      type: 'array',
      description: 'Empty: the latest articles of the same category.',
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
  // The publications under the title, so posts with the same headline tell apart in reference pickers, lists and search.
  preview: {
    select: { title: 'title', brands: 'brands', media: 'image' },
    prepare({ title, brands, media }) {
      const publications = (Array.isArray(brands) ? brands : [])
        .filter((brand): brand is EditorialBrandKey => typeof brand === 'string' && isEditorialBrandKey(brand))
        .map((brand) => BRANDS[brand].title)

      return {
        title: title || 'Untitled article',
        subtitle: publications.length > 0 ? publications.join(', ') : 'No publication',
        media,
      }
    },
  },
})
