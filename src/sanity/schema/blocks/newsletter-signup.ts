import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, imageField } from '../fields'

export const NEWSLETTER_OPTION_MAX = 8

/**
 * Newsletter signup ("Stay informed"): heading, description, editor-created options, an email field and an image.
 * UI only for now: the form validates in the browser and sends nothing. All visible copy, messages included, is here.
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
            select: { label: 'label', defaultChecked: 'defaultChecked' },
            prepare({ label, defaultChecked }) {
              return { title: label || 'Empty option', subtitle: defaultChecked ? 'Ticked by default' : undefined }
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
      ],
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
