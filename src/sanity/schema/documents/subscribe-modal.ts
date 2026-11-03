import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { type ConditionalProperty, type StringRule, defineArrayMember, defineField, defineType } from 'sanity'

import { BRANDS, isBrandKey } from '@/brands'
import { CONSENT_LINK_TOKEN, SUBSCRIBE_INTERESTS_MAX, type SubscribeModalTextField } from '@/lib/subscribe'

import { brevoAttributeField, linkField } from '../fields'

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

type TextOptions = { hidden?: ConditionalProperty; validation?: (Rule: StringRule) => StringRule }

/** A one-line text, required unless `validation` says otherwise. */
const text = (name: SubscribeModalTextField, title: string, description: string, group: string, options: TextOptions = {}) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    group,
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
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Heading at the top of the pop-up.',
      group: 'form',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Short text under the title.',
      group: 'form',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(200).warning('Longer than 200 characters; the form will move down'),
      ],
    }),
    text('firstNameLabel', 'First name label', 'Label of the first name field.', 'form'),
    text('lastNameLabel', 'Last name label', 'Label of the last name field.', 'form'),
    text('emailLabel', 'Email label', 'Label of the email field.', 'form'),
    text('emailPlaceholder', 'Email placeholder', 'Hint text inside the empty email field.', 'form'),
    text('companyLabel', 'Company label', 'Label of the company name field.', 'form'),
    text('jobTitleLabel', 'Job title label', 'Label of the job title field.', 'form'),
    text('countryLabel', 'Country label', 'Label of the country list.', 'form'),
    text('countryPlaceholder', 'Country placeholder', 'Shown in the country list until a country is chosen.', 'form'),
    text('industryLabel', 'Industry label', 'Label of the industry list.', 'form'),
    text('industryPlaceholder', 'Industry placeholder', 'Shown in the industry list until an industry is chosen.', 'form'),
    text('optionalMarker', 'Optional marker', 'Shown beside the label of every optional field.', 'form'),
    text('consentText', 'Consent text', `Text beside the consent box. ${CONSENT_LINK_TOKEN} is replaced with the Privacy Policy link.`, 'form', {
      validation: (Rule) =>
        Rule.required().custom((value: string | undefined) =>
          !value || value.split(CONSENT_LINK_TOKEN).length === 2
            ? true
            : `Use ${CONSENT_LINK_TOKEN} exactly once, where the Privacy Policy link goes`,
        ),
    }),
    text('privacyLinkLabel', 'Privacy link text', `The link text that replaces ${CONSENT_LINK_TOKEN} in the consent text.`, 'form'),
    linkField({
      name: 'privacyLink',
      title: 'Privacy link',
      description: 'Where the Privacy Policy link in the consent text goes.',
      group: 'form',
      required: true,
      withLabel: false,
    }),
    text('submitLabel', 'Subscribe button', 'Button that sends the form.', 'form'),
    text('interestsLegend', 'Interests heading', 'Shown above the interests.', 'interests', onlyOn(isPublication)),
    text('requiredMarker', 'Required marker', 'Shown beside interests that are always ticked.', 'interests', onlyOn(isPublication)),
    defineField({
      name: 'interests',
      title: 'Interests',
      type: 'array',
      group: 'interests',
      description: `What readers can choose to receive, in display order, up to ${SUBSCRIBE_INTERESTS_MAX}. On a publication the first one is its daily news, always ticked; on ClearView readers tick at least one.`,
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
              description: 'Ticked and cannot be unticked, marked with the required marker.',
              initialValue: false,
              hidden: ({ document }) => isClearview(document),
            }),
            // ClearView only; optional by design: unset reads as an empty box.
            defineField({
              name: 'defaultChecked',
              title: 'Ticked by default',
              type: 'boolean',
              description: 'Ticked when the pop-up opens. From Stay informed, the block’s ticks are used instead.',
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
    text('firstNameError', 'First name missing', 'Shown when the first name is empty.', 'messages'),
    text('lastNameError', 'Last name missing', 'Shown when the last name is empty.', 'messages'),
    text('emailMissingError', 'Email missing', 'Shown when the email address is empty.', 'messages'),
    text('emailInvalidError', 'Email not valid', 'Shown when the email address is not valid.', 'messages'),
    text('consentError', 'Consent missing', 'Shown when the consent box is not ticked.', 'messages'),
    text('noPublicationError', 'Nothing ticked', 'Shown when the reader has not ticked any of the options.', 'messages', onlyOn(isClearview)),
    text('genericError', 'Sending failed', 'Shown when the form could not be sent, for any reason. Everything typed stays in the form.', 'messages'),
    text('successTitle', 'Title', 'Heading after a new reader signs up.', 'success'),
    defineField({
      name: 'successText',
      title: 'Text',
      type: 'text',
      rows: 2,
      description: 'Shown under the heading after a new reader signs up: they still need to confirm their email.',
      group: 'success',
      validation: (Rule) => Rule.required(),
    }),
    text('closeLabel', 'Close button', 'Button under the success text that closes the pop-up.', 'success'),
  ],
  preview: {
    select: { id: '_id' },
    prepare({ id }: { id?: string }) {
      const key = brandKeyOf(id)

      return { title: `Subscribe pop-up — ${isBrandKey(key) ? BRANDS[key].title : key}`, media: EnvelopeIcon }
    },
  },
})
