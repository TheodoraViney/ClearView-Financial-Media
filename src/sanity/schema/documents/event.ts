import { defineField, defineType } from 'sanity'

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    // Placeholder list; the real client event type list is pending.
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Conference', value: 'conference' },
          { title: 'Awards ceremony', value: 'awards-ceremony' },
          { title: 'Webinar', value: 'webinar' },
          { title: 'Roundtable', value: 'roundtable' },
        ],
      },
    }),
  ],
})
