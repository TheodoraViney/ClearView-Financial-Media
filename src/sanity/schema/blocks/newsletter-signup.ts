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
import { blockAllowedOnBrand } from './shared'

export const NEWSLETTER_OPTION_MAX = 8

/**
 * Newsletter signup ("Stay informed"), ClearView pages only: heading, description, editor-created options, an email
 * field and an image. All visible copy, messages included, is here.
 *
 * The button opens the ClearView Subscribe pop-up, which has its own options. Each option here names a Brevo yes/no
 * contact attribute (e.g. WB_NEWSLETTER); a tick pre-ticks the pop-up option with the same attribute. What is sent
 * is the pop-up's choice. No attribute is projected to the page: the query matches them to the pop-up's keys.
 */
export const newsletterSignup = defineType({
  name: 'newsletterSignup',
  title: 'Newsletter signup',
  type: 'object',
  icon: EnvelopeIcon,
  // ClearView only: a publication's own signup is the Subscribe pop-up. The insert menu hides it elsewhere; this
  // catches a pasted or duplicated block. A page with no brand yet is flagged by its Brand field.
  validation: (Rule) =>
    Rule.custom((_, context) => {
      const brand = (context.document as { brand?: unknown } | undefined)?.brand

      return !brand || blockAllowedOnBrand('newsletterSignup', brand)
        ? true
        : 'Newsletter signup is for ClearView pages only; remove it from this page'
    }),
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
                'Ticking this option ticks the Subscribe pop-up option with the same attribute when the pop-up opens.',
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
    // Moved to Subscribe form settings, shared by every form. Kept, read only, until cleared on every block, then removed.
    {
      ...brevoListField('list', { title: 'Brevo list (old)', readOnly: true, hidden: ({ value }) => value === undefined }),
      deprecated: { reason: 'Every subscribe form now uses the list in Forms → Subscribe form settings.' },
    },
    {
      ...brevoTemplateField('confirmationTemplate', {
        title: 'Confirmation email (old)',
        readOnly: true,
        hidden: ({ value }) => value === undefined,
      }),
      deprecated: { reason: 'Every subscribe form now uses the email in Forms → Subscribe form settings.' },
    },
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
