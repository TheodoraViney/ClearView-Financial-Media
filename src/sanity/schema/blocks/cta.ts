import { CommentIcon } from '@sanity/icons/Comment'
import { defineType } from 'sanity'

import { adminLabelField, headingField, headingText, linkField } from '../fields'
import { paragraphsField } from '../objects/rich-text'

/** A dark panel with a heading, a line of text and one button, e.g. "Ask the team anything" → Contact. */
export const cta = defineType({
  name: 'cta',
  title: 'Contact panel',
  type: 'object',
  icon: CommentIcon,
  fields: [
    adminLabelField,
    headingField('heading', {
      title: 'Heading',
      defaultLevel: 'h2',
      initialText: 'Ask the ClearView team anything',
      required: true,
    }),
    paragraphsField({
      name: 'text',
      title: 'Text',
      initialText: 'Our team can help with membership, research, awards and event enquiries.',
      maxLength: 140,
      lengthWarning: 'Longer than 140 characters; the text will wrap onto more lines',
    }),
    {
      ...linkField({ name: 'link', title: 'Button', required: true, labelRequired: true }),
      // The label starts as the design copy; the target is the editor's (on ClearView, the Contact page).
      initialValue: { kind: 'internal', label: 'Get in touch' },
    },
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      return { title: adminLabel || headingText(heading) || 'Contact panel', subtitle: 'Contact panel' }
    },
  },
})
