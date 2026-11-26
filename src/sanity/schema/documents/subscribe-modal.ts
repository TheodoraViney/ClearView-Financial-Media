import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { type ConditionalProperty, type StringRule, defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'
import { CONSENT_LINK_TOKEN, SUBSCRIBE_INTERESTS_MAX, type SubscribeModalTextField } from '@/lib/subscribe'

import { brevoAttributeField, consentTextValidation, linkField } from '../fields'

/*
 * The subscribe pop-up's copy and interests, one document per brand with the fixed id
 * `subscribeModalDocumentId(key)` from `src/brands.ts`, opened from each brand folder in the Studio. Without it the
 * brand shows no Subscribe button. The Brevo list and confirmation email are shared by every brand, in Subscribe form
 * settings; the Country and Industry options come from Brevo. Screen-reader-only text stays in code.
 *
 * On a publication the first interest is its own daily news, always ticked. On ClearView the interests are a free
 * choice with no heading: none is always ticked, each can start ticked, and the reader must tick at least one. A
 * "Stay informed" block that opens the pop-up ticks the interests with the same Brevo attributes as its own ticks.
 */

const brandKeyOf = (id: string | undefined): string =>
  String(id ?? '').replace(/^drafts\./, '').replace(/^subscribe-modal-/, '')

type DocumentLike = { _id?: string } | undefined

const isClearview = (document: DocumentLike) => brandKeyOf(document?._id) === 'clearview'

const isPublication = (document: DocumentLike) => !isClearview(document)

type TextOptions = {
  description?: string
  fieldset?: string
  hidden?: ConditionalProperty
  validation?: (Rule: StringRule) => StringRule
}

/** A one-line text, required unless `validation` says otherwise. */
const text = (name: SubscribeModalTextField, title: string, group: string, options: TextOptions = {}) =>
  defineField({
    name,
    title,
    type: 'string',
    description: options.description,
    group,
    fieldset: options.fieldset,
    hidden: options.hidden,
    validation: options.validation ?? ((Rule) => Rule.required()),
  })

/** Shown, and required, only on the brands `applies` accepts. */
const onlyOn = (applies: (document: DocumentLike) => boolean): TextOptions => ({
  hidden: ({ document }) => !applies(document),
  validation: (Rule) =>
    Rule.custom((value: string | undefined, context) => (value?.trim() || !applies(context.document) ? true : 'Required')),
})

type Interest = { label?: string; attribute?: { name?: string }; locked?: boolean; defaultChecked?: boolean }

/** The first label or attribute name used twice, case-insensitive for labels. */
function firstDuplicate(values: (string | undefined)[], normalise = (value: string) => value) {
  const seen = new Set<string>()

  for (const value of values) {
    const key = value?.trim() ? normalise(value.trim()) : undefined

    if (!key) {
      continue
    }

    if (seen.has(key)) {
      return value!.trim()
    }

    seen.add(key)
  }

  return undefined
}

export const subscribeModal = defineType({
  name: 'subscribeModal',
  title: 'Subscribe pop-up',
  type: 'document',
  icon: EnvelopeIcon,
  groups: [
    { name: 'form', title: 'Form', default: true },
    { name: 'interests', title: 'Interests' },
    { name: 'messages', title: 'Messages' },
    { name: 'success', title: 'Success' },
  ],
  // Fieldsets follow the form from top to bottom.
  fieldsets: [
    { name: 'name', title: 'Name labels', options: { columns: 2 } },
    { name: 'email', title: 'Email field', options: { columns: 2 } },
    { name: 'work', title: 'Company and job title labels', options: { columns: 2 } },
    { name: 'country', title: 'Country list', options: { columns: 2 } },
    { name: 'industry', title: 'Industry list', options: { columns: 2 } },
    { name: 'markers', title: 'Interests heading and marker', options: { columns: 2 } },
    { name: 'errors', title: 'Error messages', options: { columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'form',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'form',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the form will move down'),
      ],
    }),
    text('firstNameLabel', 'First name', 'form', { fieldset: 'name' }),
    text('lastNameLabel', 'Last name', 'form', { fieldset: 'name' }),
    text('emailLabel', 'Label', 'form', { fieldset: 'email' }),
    text('emailPlaceholder', 'Placeholder', 'form', { fieldset: 'email' }),
    text('companyLabel', 'Company', 'form', { fieldset: 'work' }),
    text('jobTitleLabel', 'Job title', 'form', { fieldset: 'work' }),
    text('countryLabel', 'Label', 'form', { fieldset: 'country' }),
    text('countryPlaceholder', 'Placeholder', 'form', { fieldset: 'country' }),
    text('industryLabel', 'Label', 'form', { fieldset: 'industry' }),
    text('industryPlaceholder', 'Placeholder', 'form', { fieldset: 'industry' }),
    text('optionalMarker', 'Optional marker', 'form'),
    text('consentText', 'Consent text', 'form', {
      description: `${CONSENT_LINK_TOKEN} is replaced with the privacy link.`,
      validation: consentTextValidation,
    }),
    text('privacyLinkLabel', 'Privacy link text', 'form'),
    linkField({
      name: 'privacyLink',
      title: 'Privacy link',
      group: 'form',
      required: true,
      withLabel: false,
    }),
    text('submitLabel', 'Subscribe button', 'form'),
    text('interestsLegend', 'Heading', 'interests', { ...onlyOn(isPublication), fieldset: 'markers' }),
    text('requiredMarker', 'Always-ticked marker', 'interests', { ...onlyOn(isPublication), fieldset: 'markers' }),
    defineField({
      name: 'interests',
      title: 'Interests',
      type: 'array',
      group: 'interests',
      description: 'On a publication the first one is its daily news, always ticked; on ClearView readers tick at least one.',
      of: [
        defineArrayMember({
          name: 'subscribeInterest',
          title: 'Interest',
          type: 'object',
          icon: CheckmarkCircleIcon,
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            brevoAttributeField('attribute', {
              title: 'Brevo attribute',
              description: 'Readers who tick this are saved in Brevo with this attribute set to Yes.',
              required: true,
            }),
            // Optional by design: unset reads as a normal box. Publications only: ClearView locks nothing.
            defineField({
              name: 'locked',
              title: 'Always ticked',
              type: 'boolean',
              initialValue: false,
              hidden: ({ document }) => isClearview(document),
            }),
            // ClearView only; optional by design: unset reads as an empty box.
            defineField({
              name: 'defaultChecked',
              title: 'Ticked by default',
              type: 'boolean',
              description: 'When the pop-up opens from Stay informed, the block’s ticks are used instead.',
              initialValue: false,
              hidden: ({ document }) => !isClearview(document),
            }),
          ],
          preview: {
            select: { label: 'label', attribute: 'attribute.name', locked: 'locked', defaultChecked: 'defaultChecked' },
            prepare({ label, attribute, locked, defaultChecked }) {
              return {
                title: label || 'Empty interest',
                subtitle: [attribute || 'No attribute', locked ? 'Always ticked' : defaultChecked ? 'Ticked by default' : undefined]
                  .filter(Boolean)
                  .join(' · '),
              }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((interests: Interest[] | undefined, context) => {
          const items = interests ?? []

          if (items.length === 0) {
            return 'Add at least one interest'
          }

          if (items.length > SUBSCRIBE_INTERESTS_MAX) {
            return `Up to ${SUBSCRIBE_INTERESTS_MAX} interests`
          }

          if (!isClearview(context.document) && !items[0].locked) {
            return 'The first interest must be always ticked: it is this publication’s daily news'
          }

          const label = firstDuplicate(
            items.map((item) => item.label),
            (value) => value.toLowerCase(),
          )

          if (label) {
            return `Each interest needs a different label; "${label}" appears more than once`
          }

          const attribute = firstDuplicate(items.map((item) => item.attribute?.name))

          return attribute ? `Two interests set the same Brevo attribute ${attribute}` : true
        }),
    }),
    text('firstNameError', 'First name missing', 'messages', { fieldset: 'errors' }),
    text('lastNameError', 'Last name missing', 'messages', { fieldset: 'errors' }),
    text('emailMissingError', 'Email missing', 'messages', { fieldset: 'errors' }),
    text('emailInvalidError', 'Email not valid', 'messages', { fieldset: 'errors' }),
    text('consentError', 'Consent missing', 'messages', { fieldset: 'errors' }),
    text('noPublicationError', 'Nothing ticked', 'messages', { ...onlyOn(isClearview), fieldset: 'errors' }),
    // Shown for any failure; everything typed stays in the form.
    text('genericError', 'Sending failed', 'messages', { fieldset: 'errors' }),
    text('successTitle', 'Title', 'success'),
    defineField({
      name: 'successText',
      title: 'Text',
      type: 'text',
      rows: 2,
      description: 'The new reader still has to confirm their email.',
      group: 'success',
      validation: (Rule) => Rule.required(),
    }),
    text('closeLabel', 'Close button', 'success'),
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Subscribe pop-up — ${isBrandKey(key) ? BRANDS[key].title : key}`, media: EnvelopeIcon }
    },
  },
})
