import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { CONTACT_FORM_FIELDS } from '@/lib/enquiry-form'
import { CONSENT_LINK_TOKEN } from '@/lib/subscribe'

import { adminLabelField, consentTextValidation, headingField, headingText, imageField, linkField } from '../fields'

/** A required one-line text with a generic initial value (form copy, not page copy). */
const copy = (name: string, title: string, initialValue: string, fieldset: string) =>
  defineField({
    name,
    title,
    type: 'string',
    fieldset,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

/**
 * The Contact page (design wb-g-contact v1.2): breadcrumb (Home / this page), the H1, a standfirst and the contact
 * form beside an image; after sending, a message and a button back to the form. The block owns the page's H1, so
 * the page template prints no title of its own. The fields are fixed in code (`CONTACT_FORM_FIELDS`); every visible
 * string is here. Submissions go to the client's Jotform form, chosen in code, and its notification recipients in
 * Jotform get an email.
 */
export const contactForm = defineType({
  name: 'contactForm',
  title: 'Contact form',
  type: 'object',
  icon: EnvelopeIcon,
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } },
    { name: 'labels', title: 'Field labels', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'consent', title: 'Consent', options: { collapsible: true, collapsed: true } },
    { name: 'messages', title: 'Error messages', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'success', title: 'After sending', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    defineField({
      name: 'breadcrumbHomeLabel',
      title: 'Home label',
      type: 'string',
      fieldset: 'breadcrumb',
      initialValue: 'Home',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'This page label',
      type: 'string',
      fieldset: 'breadcrumb',
      validation: (Rule) => Rule.required(),
    }),
    headingField('heading', { title: 'Heading', defaultLevel: 'h1', required: true }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 2,
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the form will move down'),
      ],
    }),
    imageField('image', { required: true }),
    ...CONTACT_FORM_FIELDS.map(({ labelField, label }) => copy(labelField, label, label, 'labels')),
    {
      ...copy('optionalMarker', 'Optional marker', 'Optional', 'labels'),
      description: 'Shown beside the label of every optional field.',
    },
    defineField({
      name: 'consentText',
      title: 'Consent text',
      type: 'string',
      description: `${CONSENT_LINK_TOKEN} becomes the Privacy Policy link.`,
      fieldset: 'consent',
      initialValue: `I have read and agree to the ${CONSENT_LINK_TOKEN}.`,
      validation: consentTextValidation,
    }),
    copy('privacyLinkLabel', 'Privacy link text', 'Privacy Policy', 'consent'),
    {
      ...linkField({
        name: 'privacyLink',
        title: 'Privacy link',
        required: true,
        withLabel: false,
      }),
      fieldset: 'consent',
    },
    copy('submitLabel', 'Submit button', 'Send', 'labels'),
    copy('firstNameError', 'First name missing', 'Enter your first name.', 'messages'),
    copy('lastNameError', 'Last name missing', 'Enter your last name.', 'messages'),
    copy('jobTitleError', 'Job title missing', 'Enter your job title.', 'messages'),
    copy('companyError', 'Company missing', 'Enter your company.', 'messages'),
    copy('emailMissingError', 'Email missing', 'Enter your email address.', 'messages'),
    copy('emailInvalidError', 'Email not valid', 'Enter an email address in the format name@example.com.', 'messages'),
    copy('messageError', 'Message missing', 'Enter your message.', 'messages'),
    copy('consentError', 'Consent missing', 'Please agree to the Privacy Policy to continue.', 'messages'),
    copy('sendErrorMessage', 'Sending failed', "Something went wrong and your message wasn't sent. Please try again.", 'messages'),
    defineField({
      name: 'successMessage',
      title: 'Success message',
      type: 'text',
      rows: 2,
      fieldset: 'success',
      initialValue: 'Thank you. We have received your message.',
      validation: (Rule) => Rule.required(),
    }),
    copy('returnLabel', 'Return button', 'Return to the form', 'success'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', media: 'image' },
    prepare({ adminLabel, heading, media }) {
      return { title: adminLabel || headingText(heading) || 'Contact form', subtitle: 'Contact form', media }
    },
  },
})
