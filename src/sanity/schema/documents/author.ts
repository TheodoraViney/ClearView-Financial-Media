import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'

import { imageField } from '../fields'

/**
 * Who wrote a post: staff writers, "Editorial Staff" for unsigned pieces and
 * guest contributors. Only posts use it; event judges and speakers stay in
 * `person`.
 *
 * Legacy articles had no author record: name and location were typed into
 * each article. The city now belongs to the author.
 */
export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      description: 'No public page yet. Kept so an author page can be added later.',
    }),
    defineField({
      name: 'jobTitle',
      title: 'Job title',
      type: 'string',
      description: 'Shown next to the name, for example "Group Editor".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      description: 'Shown next to the job title, for example "London".',
    }),
    imageField('photo', {
      title: 'Photo',
      description: 'Square portrait. Without one the initials are shown.',
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'text',
      rows: 4,
      description: 'One short paragraph shown under the article.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'name', jobTitle: 'jobTitle', city: 'city', media: 'photo' },
    prepare({ title, jobTitle, city, media }) {
      return {
        title: title || 'Unnamed author',
        subtitle: [jobTitle, city].filter(Boolean).join(', ') || undefined,
        media: media ?? UsersIcon,
      }
    },
  },
})
