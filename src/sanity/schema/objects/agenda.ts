import { OlistIcon } from '@sanity/icons/Olist'
import { defineArrayMember, defineField, defineType } from 'sanity'

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

/** The session types the event page labels an agenda item with. */
export const AGENDA_SESSION_TYPES = [
  'Keynote speech',
  'Panel Session',
  'Presentation',
  'Fireside chat',
  'Tech demo',
  'Case study',
  'Interview',
  'Interactive session',
] as const

/**
 * One agenda track: a day, a room or the whole programme.
 *
 * Started as `agenda_itineraries` (created 2025-03-12, 9 events). The older
 * `cyph_agenda` wysiwyg lives on conferenceEvent as `agendaText` and is
 * converted into these items where its lines can be read.
 */
export const agenda = defineType({
  name: 'agenda',
  title: 'Agenda',
  type: 'object',
  icon: OlistIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Track title',
      type: 'string',
      description: 'A day or a room. Empty when the event has one programme.',
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
          fieldsets: [{ name: 'when', title: 'Time', description: '24-hour clock, for example 08:15.', options: { columns: 2 } }],
          fields: [
            defineField({
              name: 'time',
              title: 'Start',
              type: 'string',
              fieldset: 'when',
              validation: (Rule) => [
                Rule.regex(TIME_OF_DAY, { name: 'time of day' }),
                Rule.custom((time, context) =>
                  time || (context.parent as { endTime?: string } | undefined)?.endTime
                    ? true
                    : 'An item without a time shows only its text.',
                ).warning(),
              ],
            }),
            defineField({
              name: 'endTime',
              title: 'End',
              type: 'string',
              fieldset: 'when',
              validation: (Rule) => [
                Rule.regex(TIME_OF_DAY, { name: 'time of day' }),
                Rule.custom((endTime, context) => {
                  const start = (context.parent as { time?: string } | undefined)?.time

                  if (!endTime || !start) {
                    return true
                  }

                  return endTime > start ? true : 'The end time must be after the start time.'
                }),
              ],
            }),
            defineField({
              name: 'sessionType',
              title: 'Session type',
              type: 'string',
              description: 'Empty for breaks, registration and networking.',
              options: { list: [...AGENDA_SESSION_TYPES], layout: 'dropdown' },
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) =>
                Rule.custom((title, context) =>
                  title || (context.parent as { text?: unknown[] } | undefined)?.text?.length
                    ? true
                    : 'Add a title or a description.',
                ),
            }),
            defineField({
              name: 'text',
              title: 'Description',
              type: 'richText',
            }),
            defineField({
              name: 'speakers',
              title: 'Speakers',
              type: 'array',
              of: [
                defineArrayMember({
                  name: 'agendaSpeaker',
                  title: 'Speaker',
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'person',
                      title: 'Person',
                      type: 'reference',
                      to: [{ type: 'person' }],
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'chair',
                      title: 'Chair',
                      type: 'boolean',
                      initialValue: false,
                    }),
                  ],
                  preview: {
                    select: { title: 'person.title', chair: 'chair' },
                    prepare({ title, chair }) {
                      return { title: title || 'No person', subtitle: chair ? 'Chair' : undefined }
                    },
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'title', time: 'time', endTime: 'endTime', sessionType: 'sessionType' },
            prepare({ title, time, endTime, sessionType }) {
              const when = [time, endTime].filter(Boolean).join('–')

              return {
                title: title || sessionType || 'Untitled item',
                subtitle: [when, title ? sessionType : null].filter(Boolean).join(' · ') || undefined,
              }
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
