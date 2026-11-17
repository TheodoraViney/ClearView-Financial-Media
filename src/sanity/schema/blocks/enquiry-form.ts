import { CommentIcon } from '@sanity/icons/Comment'
import { defineField, defineType } from 'sanity'

import { ENQUIRY_FORM_FIELDS } from '@/lib/enquiry-form'

import { ANCHOR_ID, adminLabelField, headingField, headingText } from '../fields'

/** The anchor id a new form starts with; the hero button and the opportunity card links start pointing at it. */
export const ENQUIRY_FORM_DEFAULT_ANCHOR = 'enquiry'

/**
 * "Start a conversation": heading and an enquiry form with a fixed set of fields (src/lib/enquiry-form.ts). Every
 * visible label is here. The form sends nothing yet: where enquiries go is not decided, so there is no recipient or
 * list field. The anchor id lets buttons elsewhere on the page scroll to it (`#enquiry`).
 */
export const enquiryForm = defineType({
  name: 'enquiryForm',
  title: 'Enquiry form',
  type: 'object',
  icon: CommentIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'anchorId',
      title: 'Anchor id',
      type: 'string',
      description: `Buttons and links on this page reach the form with # and this id, e.g. #${ENQUIRY_FORM_DEFAULT_ANCHOR}. Lowercase letters, digits and hyphens. Changing it breaks those links until they are updated.`,
      initialValue: ENQUIRY_FORM_DEFAULT_ANCHOR,
      validation: (Rule) => [
        Rule.required(),
        Rule.regex(ANCHOR_ID, { name: 'anchor id' }).error(
          'Use lowercase letters, digits and hyphens, starting with a letter',
        ),
      ],
    }),
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Start a conversation', required: true }),
    ...ENQUIRY_FORM_FIELDS.map(({ labelField, label, required }) =>
      defineField({
        name: labelField,
        title: `${label} label`,
        type: 'string',
        description: required ? 'Required on the form.' : 'Optional on the form.',
        initialValue: label,
        validation: (Rule) => Rule.required(),
      }),
    ),
    defineField({
      name: 'submitLabel',
      title: 'Submit button label',
      type: 'string',
      initialValue: 'Send enquiry',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'requiredMessage',
      title: 'Empty field message',
      type: 'string',
      description: 'Shown under a required field left empty.',
      initialValue: 'Please fill in this field.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'invalidEmailMessage',
      title: 'Invalid email message',
      type: 'string',
      description: 'Shown under the email field when the address is not valid.',
      initialValue: 'Please enter a valid email address.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', anchorId: 'anchorId' },
    prepare({ adminLabel, heading, anchorId }) {
      return {
        title: adminLabel || headingText(heading) || 'Enquiry form',
        subtitle: `Enquiry form${anchorId ? ` · #${anchorId}` : ''}`,
      }
    },
  },
})
