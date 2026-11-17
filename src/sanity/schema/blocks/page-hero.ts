import { HomeIcon } from '@sanity/icons/Home'
import { defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'

/**
 * The head of a page's main column: breadcrumb (Home / this page), the H1 and an optional intro. Goes in the main
 * column of a Two columns block. The title is the page's H1, so it is plain text, not a heading field.
 */
export const pageHero = defineType({
  name: 'pageHero',
  title: 'Page heading',
  type: 'object',
  icon: HomeIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'breadcrumbHomeLabel',
      title: 'Breadcrumb home label',
      type: 'string',
      description: 'First item of the breadcrumb, linking to the home page.',
      initialValue: 'Home',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'Breadcrumb current label',
      type: 'string',
      description: 'Last item of the breadcrumb: this page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "The page's main heading (H1).",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 2,
      description: 'Optional. Text under the title.',
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', title: 'title' },
    prepare({ adminLabel, title }) {
      return { title: adminLabel || title || 'Page heading', subtitle: 'Page heading', media: HomeIcon }
    },
  },
})
