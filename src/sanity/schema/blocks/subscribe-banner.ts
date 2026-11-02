import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, linkField } from '../fields'

/**
 * A publication's newsletter call to action: heading, a short description and one button. Not the ClearView
 * "Stay informed" form (`newsletterSignup`). The button links out until the Subscribe modal is built.
 */
export const subscribeBanner = defineType({
  name: 'subscribeBanner',
  title: 'Subscribe banner',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Stay informed', required: true }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      initialValue: 'Get the latest WealthBriefing news, analysis, research and event updates in your inbox.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the banner will wrap onto more lines'),
      ],
    }),
    defineField({
      ...linkField({ name: 'cta', title: 'Button', required: true, labelRequired: true }),
      initialValue: { kind: 'internal', label: 'Subscribe to the daily newsletter' },
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      return {
        title: adminLabel || headingText(heading) || 'Subscribe banner',
        subtitle: `Subscribe banner · ${headingText(heading) ?? 'No heading'}`,
      }
    },
  },
})
