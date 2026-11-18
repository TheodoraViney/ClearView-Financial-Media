import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { CONTACT_FORM_FIELDS } from '@/lib/enquiry-form'
import { CONSENT_LINK_TOKEN } from '@/lib/subscribe'

import { adminLabelField, consentTextValidation, headingField, headingText, imageField, linkField } from '../fields'

/** A required one-line text with a generic initial value (form copy, not page copy). */
const copy = (name: string, title: string, description: string, initialValue: string, fieldset: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    fieldset,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

/**
 * The Contact page (design wb-g-contact v1.2): breadcrumb (Home / this page), the H1, a standfirst and the contact
 * form beside an image; after sending, a message and a button back to the form. The block owns the page's H1, so
 * the page template prints no title of its own. The fields are fixed in code (`CONTACT_FORM_FIELDS`); every visible
 * string is here. The form sends nothing yet: submissions will go to a form service whose links come later.
 */
export const contactForm = defineType({
  name: 'contactForm',
  title: 'Contact form',
  type: 'object',
  icon: EnvelopeIcon,
  fieldsets: [
    { name: 'labels', title: 'Field labels', options: { collapsible: true, collapsed: true } },
    { name: 'consent', title: 'Consent', options: { collapsible: true, collapsed: true } },
    { name: 'messages', title: 'Error messages', options: { collapsible: true, collapsed: true } },
    { name: 'success', title: 'After sending', options: { collapsible: true, collapsed: true } },
  ],
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
    headingField('heading', { title: 'Heading', defaultLevel: 'h1', required: true }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 2,
      description: 'Text under the heading, above the form.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the form will move down'),
      ],
    }),
    imageField('image', { description: 'Shown beside the form on desktop, below it on smaller screens.', required: true }),
    ...CONTACT_FORM_FIELDS.map(({ labelField, label, required }) =>
      copy(labelField, `${label} label`, required ? 'Required on the form.' : 'Optional on the form.', label, 'labels'),
    ),
    copy('optionalMarker', 'Optional marker', 'Shown beside the label of every optional field.', 'Optional', 'labels'),
    defineField({
      name: 'consentText',
      title: 'Consent text',
      type: 'string',
      description: `Text beside the consent box. ${CONSENT_LINK_TOKEN} is replaced with the Privacy Policy link.`,
      fieldset: 'consent',
      initialValue: `I have read and agree to the ${CONSENT_LINK_TOKEN}.`,
      validation: consentTextValidation,
    }),
    copy(
      'privacyLinkLabel',
      'Privacy link text',
      `The link text that replaces ${CONSENT_LINK_TOKEN} in the consent text.`,
      'Privacy Policy',
      'consent',
    ),
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
    copy('submitLabel', 'Submit button label', 'Button that sends the form.', 'Send', 'labels'),
    copy('firstNameError', 'First name missing', 'Shown when the first name is empty.', 'Enter your first name.', 'messages'),
    copy('lastNameError', 'Last name missing', 'Shown when the last name is empty.', 'Enter your last name.', 'messages'),
    copy('emailMissingError', 'Email missing', 'Shown when the email address is empty.', 'Enter your email address.', 'messages'),
    copy(
      'emailInvalidError',
      'Email not valid',
      'Shown when the email address is not valid.',
      'Enter an email address in the format name@example.com.',
      'messages',
    ),
    copy('messageError', 'Message missing', 'Shown when the message is empty.', 'Enter your message.', 'messages'),
    copy(
      'consentError',
      'Consent missing',
      'Shown when the consent box is not ticked.',
      'Please agree to the Privacy Policy to continue.',
      'messages',
    ),
    defineField({
      name: 'successMessage',
      title: 'Success message',
      type: 'text',
      rows: 2,
      description: 'Shown in place of the form once the message is sent.',
      fieldset: 'success',
      initialValue: 'Thank you. We have received your message.',
      validation: (Rule) => Rule.required(),
    }),
    copy(
      'returnLabel',
      'Return button label',
      'Button under the success message that shows an empty form again.',
      'Return to the form',
      'success',
    ),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', media: 'image' },
    prepare({ adminLabel, heading, media }) {
      return { title: adminLabel || headingText(heading) || 'Contact form', subtitle: 'Contact form', media }
    },
  },
})
