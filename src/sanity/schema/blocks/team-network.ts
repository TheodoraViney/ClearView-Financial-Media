import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, imageField } from '../fields'
import { paragraphsField } from '../objects/rich-text'

/**
 * A wide team photo, then a heading with the publications' logos beside a text and a short quote. The logos come from
 * the editorial brands' Brand settings, so they are not chosen here.
 */
export const teamNetwork = defineType({
  name: 'teamNetwork',
  title: 'Team and publications',
  type: 'object',
  icon: UsersIcon,
  fields: [
    adminLabelField,
    imageField('image', {
      required: true,
      description: 'Set the hotspot on the faces so they stay in view when cropped.',
    }),
    headingField('heading', {
      title: 'Heading',
      defaultLevel: 'h2',
      initialText: 'A wider network, an experienced team',
      required: true,
    }),
    paragraphsField({
      name: 'body',
      title: 'Text',
      description: "The publications' logos under the heading come from Brand settings.",
      initialText:
        "WealthBriefing, WealthBriefingAsia and Family Wealth Report connect wealth professionals through ClearView’s news, research, awards and events. Group Editor Tom Burroughes leads coverage; Publisher Stephen Harris brings 30+ years’ City experience.",
    }),
    paragraphsField({
      name: 'quote',
      title: 'Quote',
      description: 'Without quotation marks.',
      initialText: 'ClearView describes its mission as bringing the global wealth management industry together.',
    }),
    defineField({
      name: 'quoteCaption',
      title: 'Quote caption',
      type: 'string',
      initialValue: 'ClearView Financial Media',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', media: 'image' },
    prepare({ adminLabel, heading, media }) {
      return {
        title: adminLabel || headingText(heading) || 'Team and publications',
        subtitle: 'Team and publications',
        media,
      }
    },
  },
})
