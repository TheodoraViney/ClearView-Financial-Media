import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, imageField } from '../fields'

/**
 * The head of a page such as About: a dark photo card with the breadcrumb (Home / this page) and the H1 at the top and
 * a standfirst at the bottom, all in white over the photo.
 */
export const overlayHero = defineType({
  name: 'overlayHero',
  title: 'Hero over image',
  type: 'object',
  icon: ImageIcon,
  fieldsets: [{ name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } }],
  fields: [
    adminLabelField,
    defineField({
      name: 'breadcrumbHomeLabel',
      title: 'Home',
      type: 'string',
      fieldset: 'breadcrumb',
      initialValue: 'Home',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'This page',
      type: 'string',
      fieldset: 'breadcrumb',
      initialValue: 'About',
      validation: (Rule) => Rule.required(),
    }),
    headingField('heading', {
      title: 'Heading',
      defaultLevel: 'h1',
      initialText: 'Connecting the global wealth management community',
      required: true,
    }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 3,
      initialValue:
        'ClearView Financial Media brings news and analysis, research, awards and industry events to professionals across global wealth management.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the text will cover more of the image'),
      ],
    }),
    imageField('image', {
      required: true,
      description: 'Behind white text: choose a dark photo.',
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', media: 'image' },
    prepare({ adminLabel, heading, media }) {
      return { title: adminLabel || headingText(heading) || 'Hero over image', subtitle: 'Hero over image', media }
    },
  },
})
