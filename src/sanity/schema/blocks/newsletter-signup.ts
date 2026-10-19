import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineArrayMember, defineField, defineType } from 'sanity'

import {
  adminLabelField,
  brevoAttributeField,
  brevoListField,
  brevoTemplateField,
  headingField,
  headingText,
  imageField,
} from '../fields'

export const NEWSLETTER_OPTION_MAX = 8

/**
 * Newsletter signup ("Stay informed"): heading, description, editor-created options, an email field and an image.
 * All visible copy, messages included, is here.
 *
 * Brevo: each option names the yes/no contact attribute a tick sets (e.g. WB_NEWSLETTER, which the newsletter
 * segments are built on). The block names the one list every reader joins, since double opt-in needs a list, and the
 * confirmation email Brevo sends first. The form is still UI only: it validates in the browser and sends nothing yet.
 * None of the Brevo fields is projected to the page, so the browser never sees them: the server will read them from
 * the block when the form is wired.
 */
export const newsletterSignup = defineType({
  name: 'newsletterSignup',
  title: 'Newsletter signup',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    defineField({
      name: 'body',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Short text under the heading.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(240).warning('Longer than 240 characters; the text will push the form down'),
      ],
    }),
    defineField({
      name: 'preferencesLabel',
      title: 'Options label',
      type: 'string',
      description: 'Shown above the options.',
      initialValue: 'Select the updates you would like to receive:',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',
      description: 'What readers can choose to receive, in display order.',
      of: [
        defineArrayMember({
          name: 'newsletterOption',
          title: 'Option',
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            brevoAttributeField('attribute', {
              title: 'Brevo attribute',
              description:
                'Readers who tick this option are saved in Brevo with this attribute set to Yes, once they confirm their email.',
              required: true,
            }),
            // Optional by design: unset reads as unticked.
            defineField({
              name: 'defaultChecked',
              title: 'Ticked by default',
              type: 'boolean',
              description: 'The box starts ticked; readers can untick it.',
              initialValue: false,
            }),
          ],
          preview: {
            select: { label: 'label', defaultChecked: 'defaultChecked', attribute: 'attribute.name' },
            prepare({ label, defaultChecked, attribute }) {
              return {
                title: label || 'Empty option',
                subtitle: [attribute || 'No attribute', defaultChecked ? 'Ticked by default' : undefined].filter(Boolean).join(' · '),
              }
            },
          },
        }),
      ],
      validation: (Rule) => [
        Rule.required().min(1).max(NEWSLETTER_OPTION_MAX),
        Rule.custom((options: { label?: string }[] | undefined) => {
          const seen = new Set<string>()

          for (const option of options ?? []) {
            const key = option.label?.trim().toLowerCase()

            if (!key) {
              continue
            }

            if (seen.has(key)) {
              return `Each option needs a different label; "${option.label?.trim()}" appears more than once`
            }

            seen.add(key)
          }

          return true
        }),
        // Allowed, but most likely a copy-paste slip: two boxes would set the same attribute.
        Rule.custom((options: { label?: string; attribute?: { name?: string } }[] | undefined) => {
          const seen = new Map<string, string>()

          for (const option of options ?? []) {
            const name = option.attribute?.name

            if (!name) {
              continue
            }

            const other = seen.get(name)

            if (other !== undefined) {
              return `"${other}" and "${option.label?.trim() ?? ''}" both set the Brevo attribute ${name}`
            }

            seen.set(name, option.label?.trim() ?? '')
          }

          return true
        }).warning(),
      ],
    }),
    brevoListField('list', {
      title: 'Brevo list',
      description:
        'Every reader who signs up through this form is added to this list. Brevo needs one for the confirmation email.',
      required: true,
    }),
    brevoTemplateField('confirmationTemplate', {
      title: 'Confirmation email',
      description:
        'The Brevo email that asks readers to confirm their address before they are signed up. Only templates tagged optin in Brevo appear.',
      required: true,
    }),
    defineField({
      name: 'emailPlaceholder',
      title: 'Email placeholder',
      type: 'string',
      description: 'Hint text inside the empty email field.',
      initialValue: 'Enter your email address',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'buttonLabel',
      title: 'Button label',
      type: 'string',
      initialValue: 'Sign Up',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'invalidEmailMessage',
      title: 'Invalid email message',
      type: 'string',
      description: 'Shown under the field when the email address is empty or not valid.',
      initialValue: 'Please enter a valid email address.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'noOptionMessage',
      title: 'No option chosen message',
      type: 'string',
      description: 'Shown under the options when the reader has not chosen any. Keep it to one short line.',
      initialValue: 'Choose at least one update.',
      validation: (Rule) =>
        Rule.required().max(40).warning('Longer than 40 characters; on phones the message may run into the text below'),
    }),
    imageField('image', { required: true }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', options: 'options' },
    prepare({ adminLabel, heading, options }) {
      const count = Array.isArray(options) ? options.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Newsletter signup',
        subtitle: `${count} ${count === 1 ? 'option' : 'options'}`,
      }
    },
  },
})
