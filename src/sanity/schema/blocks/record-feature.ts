import { SplitHorizontalIcon } from '@sanity/icons/SplitHorizontal'
import { defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, imageField } from '../fields'
import { paragraphsField } from '../objects/rich-text'

/** A photo beside a heading and text, with one headline figure (value and label) at the foot of the text. */
export const recordFeature = defineType({
  name: 'recordFeature',
  title: 'Image with figure',
  type: 'object',
  icon: SplitHorizontalIcon,
  fields: [
    adminLabelField,
    imageField('image', { required: true }),
    headingField('heading', {
      title: 'Heading',
      defaultLevel: 'h2',
      initialText: 'A record of the industry',
      required: true,
    }),
    paragraphsField({
      name: 'text',
      title: 'Text',
      initialText:
        "ClearView runs regular research and industry events, including Breakfast Briefings, Summits and awards programmes. The group's archive reaches back to 2001.",
    }),
    defineField({
      name: 'figureValue',
      title: 'Figure',
      type: 'string',
      description: 'The headline number, e.g. "Almost 200,000".',
      initialValue: 'Almost 200,000',
      validation: (Rule) => [Rule.required(), Rule.max(24).warning('Short figures read best')],
    }),
    defineField({
      name: 'figureLabel',
      title: 'Figure label',
      type: 'string',
      description: 'What the figure counts.',
      initialValue: 'articles and news items in the archive',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', media: 'image' },
    prepare({ adminLabel, heading, media }) {
      return { title: adminLabel || headingText(heading) || 'Image with figure', subtitle: 'Image with figure', media }
    },
  },
})
