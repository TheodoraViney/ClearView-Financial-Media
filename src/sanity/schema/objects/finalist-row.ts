import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'

/**
 * One shortlist inside an AwardsProgramme: the finalist companies under a category group and, on older editions, an
 * award category (a document only: a shortlist whose category has none was left out of the migration, its text is in
 * the legacy Finalists field). Names are plain text, one a line: finalists are not linked to company documents, which would add a
 * reference per name for thousands of names. Parsed by hand out of the legacy Finalists rich text.
 */
export const finalistRow = defineType({
  name: 'finalistRow',
  title: 'Finalists',
  type: 'object',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'categoryGroup',
      title: 'Category group',
      type: 'string',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'awardCategory' }],
    }),
    defineField({
      name: 'companies',
      title: 'Companies',
      type: 'text',
      rows: 8,
      description: 'One a line.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { group: 'categoryGroup', category: 'category.title', companies: 'companies' },
    prepare({ group, category, companies }) {
      const count = typeof companies === 'string' ? companies.split('\n').filter((line) => line.trim()).length : 0

      return {
        title: category || group || 'Finalists',
        subtitle: [category ? group : null, `${count} ${count === 1 ? 'company' : 'companies'}`]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
