import { UsersIcon } from '@sanity/icons/Users'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * A named list of People.
 *
 * Covers the two `post_object` repeaters that share this shape in the source:
 * `cyph_judges_panels` (54 events, panel name plus judges) and
 * `cyph_speaker_types` (20 events, speaker type plus speakers).
 */
export const personGroup = defineType({
  name: 'personGroup',
  title: 'Group of people',
  type: 'object',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Group name',
      type: 'string',
      description: 'For example "Trusted Advisors" or "Keynote speakers".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'person' }] })],
      validation: (Rule) => Rule.unique().min(1),
    }),
  ],
  preview: {
    select: { name: 'name', count: 'people' },
    prepare({ name, count }) {
      const people = (count as unknown[] | undefined)?.length ?? 0

      return {
        title: name || 'Unnamed group',
        subtitle: `${people} ${people === 1 ? 'person' : 'people'}`,
      }
    },
  },
})
