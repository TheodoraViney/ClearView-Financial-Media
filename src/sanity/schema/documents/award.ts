import { defineField, defineType } from 'sanity'

export const award = defineType({
  name: 'award',
  title: 'Award',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      options: {
        list: [
          { title: 'UK', value: 'uk' },
          { title: 'Asia', value: 'asia' },
          { title: 'US', value: 'us' },
          { title: 'Global', value: 'global' },
        ],
      },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Entries open', value: 'entriesOpen' },
          { title: 'Entries closed', value: 'entriesClosed' },
          { title: 'Judging', value: 'judging' },
          { title: 'Awarded', value: 'awarded' },
        ],
      },
    }),
  ],
})
