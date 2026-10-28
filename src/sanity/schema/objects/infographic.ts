import { DashboardIcon } from '@sanity/icons/Dashboard'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * An infographic drawn by the site from text: a highlighted centre box with
 * one to three groups around it (left, right, below), stacked on narrow
 * screens. One fixed layout, no chart types and no uploaded image.
 *
 * Every field is a plain string or a list of strings, so the text can later be
 * filled by an AI assistant without a schema change. The screen-reader
 * description is built from these fields in code.
 */
export const infographic = defineType({
  name: 'infographic',
  title: 'Infographic',
  type: 'object',
  icon: DashboardIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small text above the title.',
      initialValue: 'Article infographic',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 2,
      description: 'One sentence under the title.',
    }),
    defineField({
      name: 'hub',
      title: 'Centre box',
      type: 'string',
      description: 'Text in the highlighted box in the middle, for example "Nordic wealth management".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'groups',
      title: 'Groups',
      type: 'array',
      description: 'One to three groups around the centre box: the first on the left, the second on the right, the third below.',
      of: [
        defineArrayMember({
          name: 'infographicGroup',
          title: 'Group',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Group heading, for example "Audience".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'items',
              title: 'Items',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: { title: 'label', items: 'items' },
            prepare({ title, items }) {
              return { title, subtitle: Array.isArray(items) ? items.join(', ') : undefined }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(3),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional line under the infographic.',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Optional source line under the caption.',
    }),
  ],
  preview: {
    select: { title: 'title', groups: 'groups' },
    prepare({ title, groups }) {
      const count = Array.isArray(groups) ? groups.length : 0

      return {
        title: title || 'Infographic',
        subtitle: `Infographic · ${count} ${count === 1 ? 'group' : 'groups'}`,
        media: DashboardIcon,
      }
    },
  },
})
