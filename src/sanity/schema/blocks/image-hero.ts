import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, imageField, linkField } from '../fields'
import { ENQUIRY_FORM_DEFAULT_ANCHOR } from './enquiry-form'

/**
 * The head of a landing page such as Sponsorship: breadcrumb (Home / this page), eyebrow, the H1, a standfirst and one
 * button beside a large image. The button usually scrolls to a form block on the same page (`#id`).
 */
export const imageHero = defineType({
  name: 'imageHero',
  title: 'Hero with image',
  type: 'object',
  icon: ImageIcon,
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
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Short line above the heading.',
      validation: (Rule) => Rule.required(),
    }),
    headingField('heading', { title: 'Heading', defaultLevel: 'h1', required: true }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 2,
      description: 'Text above the button.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the text will push the button down'),
      ],
    }),
    {
      ...linkField({
        name: 'button',
        title: 'Button',
        description: `To scroll to the enquiry form on this page, choose Web address and enter #${ENQUIRY_FORM_DEFAULT_ANCHOR} (the form's anchor id).`,
        required: true,
        labelRequired: true,
        allowAnchor: true,
      }),
      // Starts pointing at the enquiry form's default anchor; the label is the editor's.
      initialValue: { kind: 'external', external: `#${ENQUIRY_FORM_DEFAULT_ANCHOR}` },
    },
    imageField('image', { required: true }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', media: 'image' },
    prepare({ adminLabel, heading, media }) {
      return { title: adminLabel || headingText(heading) || 'Hero with image', subtitle: 'Hero with image', media }
    },
  },
})
