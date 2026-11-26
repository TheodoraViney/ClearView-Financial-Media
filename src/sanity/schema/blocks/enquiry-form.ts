import { CommentIcon } from '@sanity/icons/Comment'
import { defineField, defineType } from 'sanity'

import { ENQUIRY_FORM_FIELDS } from '@/lib/enquiry-form'
import { CONSENT_LINK_TOKEN } from '@/lib/subscribe'

import { ANCHOR_ID, adminLabelField, consentTextValidation, headingField, headingText, linkField } from '../fields'

/** The anchor id a new form starts with; the hero button and the opportunity card links start pointing at it. */
export const ENQUIRY_FORM_DEFAULT_ANCHOR = 'enquiry'

/**
 * "Start a conversation": heading and an enquiry form with a fixed set of fields (src/lib/enquiry-form.ts) and a
 * consent box; after sending, a message and a button back to the form. Every visible string is here. Enquiries go to
 * the client's Jotform form, chosen in code, and its notification recipients in Jotform get an email, so there is no
 * recipient field. The anchor id lets buttons elsewhere on the page scroll to it (`#enquiry`).
 */
export const enquiryForm = defineType({
  name: 'enquiryForm',
  title: 'Enquiry form',
  type: 'object',
  icon: CommentIcon,
  fieldsets: [
    { name: 'labels', title: 'Field labels', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'consent', title: 'Consent', options: { collapsible: true, collapsed: true } },
    { name: 'messages', title: 'Error messages', options: { collapsible: true, collapsed: true } },
    { name: 'success', title: 'After sending', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    defineField({
      name: 'anchorId',
      title: 'Anchor id',
      type: 'string',
      description: `Buttons on this page scroll to the form with #id, e.g. #${ENQUIRY_FORM_DEFAULT_ANCHOR}. Changing it breaks those links.`,
      initialValue: ENQUIRY_FORM_DEFAULT_ANCHOR,
      validation: (Rule) => [
        Rule.required(),
        Rule.regex(ANCHOR_ID, { name: 'anchor id' }).error(
          'Use lowercase letters, digits and hyphens, starting with a letter',
        ),
      ],
    }),
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Start a conversation', required: true }),
    ...ENQUIRY_FORM_FIELDS.map(({ labelField, label }) =>
      defineField({
        name: labelField,
        title: label,
        type: 'string',
        fieldset: 'labels',
        initialValue: label,
        validation: (Rule) => Rule.required(),
      }),
    ),
    defineField({
      name: 'consentText',
      title: 'Consent text',
      type: 'string',
      description: `${CONSENT_LINK_TOKEN} becomes the Privacy Policy link.`,
      fieldset: 'consent',
      initialValue: `I have read and agree to the ${CONSENT_LINK_TOKEN}.`,
      validation: consentTextValidation,
    }),
    defineField({
      name: 'privacyLinkLabel',
      title: 'Privacy link text',
      type: 'string',
      fieldset: 'consent',
      initialValue: 'Privacy Policy',
      validation: (Rule) => Rule.required(),
    }),
    {
      ...linkField({
        name: 'privacyLink',
        title: 'Privacy link',
        required: true,
        withLabel: false,
      }),
      fieldset: 'consent',
    },
    defineField({
      name: 'consentError',
      title: 'Consent missing',
      type: 'string',
      fieldset: 'messages',
      initialValue: 'Please agree to the Privacy Policy to continue.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'submitLabel',
      title: 'Submit button',
      type: 'string',
      fieldset: 'labels',
      initialValue: 'Send enquiry',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'requiredMessage',
      title: 'Empty field',
      type: 'string',
      fieldset: 'messages',
      initialValue: 'Please fill in this field.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'invalidEmailMessage',
      title: 'Email not valid',
      type: 'string',
      fieldset: 'messages',
      initialValue: 'Please enter a valid email address.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sendErrorMessage',
      title: 'Sending failed',
      type: 'string',
      fieldset: 'messages',
      initialValue: "Something went wrong and your message wasn't sent. Please try again.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'successMessage',
      title: 'Success message',
      type: 'text',
      rows: 2,
      fieldset: 'success',
      initialValue: 'Thank you. We have received your enquiry.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'returnLabel',
      title: 'Return button',
      type: 'string',
      fieldset: 'success',
      initialValue: 'Return to the form',
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
