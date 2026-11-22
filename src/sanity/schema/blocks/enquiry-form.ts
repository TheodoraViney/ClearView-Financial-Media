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
    { name: 'consent', title: 'Consent', options: { collapsible: true, collapsed: true } },
    { name: 'success', title: 'After sending', options: { collapsible: true, collapsed: true } },
  ],
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
      name: 'consentText',
      title: 'Consent text',
      type: 'string',
      description: `Text beside the consent box. ${CONSENT_LINK_TOKEN} is replaced with the Privacy Policy link.`,
      fieldset: 'consent',
      initialValue: `I have read and agree to the ${CONSENT_LINK_TOKEN}.`,
      validation: consentTextValidation,
    }),
    defineField({
      name: 'privacyLinkLabel',
      title: 'Privacy link text',
      type: 'string',
      description: `The link text that replaces ${CONSENT_LINK_TOKEN} in the consent text.`,
      fieldset: 'consent',
      initialValue: 'Privacy Policy',
      validation: (Rule) => Rule.required(),
    }),
    {
      ...linkField({
        name: 'privacyLink',
        title: 'Privacy link',
        description: "Where the Privacy Policy link in the consent text goes: this brand's Privacy policy page.",
        required: true,
        withLabel: false,
      }),
      fieldset: 'consent',
    },
    defineField({
      name: 'consentError',
      title: 'Consent missing',
      type: 'string',
      description: 'Shown when the consent box is not ticked.',
      fieldset: 'consent',
      initialValue: 'Please agree to the Privacy Policy to continue.',
      validation: (Rule) => Rule.required(),
    }),
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
    defineField({
      name: 'sendErrorMessage',
      title: 'Sending failed message',
      type: 'string',
      description: 'Shown above the button when the enquiry could not be sent. What the visitor typed stays in the form.',
      initialValue: "Something went wrong and your message wasn't sent. Please try again.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'successMessage',
      title: 'Success message',
      type: 'text',
      rows: 2,
      description: 'Shown in place of the form once the enquiry is sent.',
      fieldset: 'success',
      initialValue: 'Thank you. We have received your enquiry.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'returnLabel',
      title: 'Return button label',
      type: 'string',
      description: 'Button under the success message that shows an empty form again.',
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
