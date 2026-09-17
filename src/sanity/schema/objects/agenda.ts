import { OlistIcon } from '@sanity/icons/Olist'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * One agenda track, as stored by `agenda_itineraries` (created 2025-03-12).
 *
 * A three-level repeater in the source: itinerary title, then timed rows, then
 * a group holding the row's title and text. It sits on 9 events. The older
 * `cyph_agenda` wysiwyg (2022-07-15) was never removed and lives on
 * conferenceEvent as `agendaText`; a record uses one or the other.
 */
export const agenda = defineType({
  name: 'agenda',
  title: 'Agenda',
  type: 'object',
  icon: OlistIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Itinerary title',
      type: 'string',
      description: 'For example "Draft Agenda" or a day name. Optional, only 2 of 9 records carry one.',
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'agendaItem',
          title: 'Agenda item',
          type: 'object',
          fields: [
            defineField({
              name: 'time',
              title: 'Time',
              type: 'string',
              description: '24-hour clock, for example 08:15.',
              validation: (Rule) =>
                Rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
                  name: 'time of day',
                  invert: false,
                }),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'text',
              title: 'Description',
              type: 'richText',
            }),
          ],
          preview: {
            select: { title: 'title', time: 'time' },
            prepare({ title, time }) {
              return { title: title || 'Untitled item', subtitle: time || undefined }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'title', items: 'items' },
    prepare({ title, items }) {
      const count = (items as unknown[] | undefined)?.length ?? 0

      return {
        title: title || 'Agenda',
        subtitle: `${count} ${count === 1 ? 'item' : 'items'}`,
      }
    },
  },
})
