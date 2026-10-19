import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { FilterIcon } from '@sanity/icons/Filter'
import { TagIcon } from '@sanity/icons/Tag'
import { UsersIcon } from '@sanity/icons/Users'
import { defineField, defineType } from 'sanity'

import {
  BrevoAttributeInput,
  BrevoListInput,
  BrevoSegmentInput,
  BrevoSenderInput,
  BrevoTemplateInput,
} from '@/sanity/components/brevo-picker-input'

/**
 * A Brevo list, segment, template, sender or contact attribute chosen from a dropdown loaded from the live account
 * (GET /api/brevo/…), so editors never type an id. The name (and a sender's email) is copied at selection time, to
 * show what was picked even when Brevo is unreachable or the item was deleted there. Only `id` is sent to Brevo, or
 * the name for an attribute, which has no id.
 *
 * The sub-fields are filled by the picker only; Studio never shows them as separate inputs.
 */

const idField = defineField({ name: 'id', title: 'Brevo id', type: 'number', readOnly: true })

const nameField = defineField({ name: 'name', title: 'Name in Brevo', type: 'string', readOnly: true })

export const brevoList = defineType({
  name: 'brevoList',
  title: 'Brevo list',
  type: 'object',
  icon: UsersIcon,
  fields: [idField, nameField],
  components: { input: BrevoListInput },
  preview: {
    select: { id: 'id', name: 'name' },
    prepare: ({ id, name }) => ({ title: name || 'No list', subtitle: id ? `Brevo list #${id}` : undefined }),
  },
})

export const brevoTemplate = defineType({
  name: 'brevoTemplate',
  title: 'Brevo template',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [idField, nameField],
  components: { input: BrevoTemplateInput },
  preview: {
    select: { id: 'id', name: 'name' },
    prepare: ({ id, name }) => ({ title: name || 'No template', subtitle: id ? `Brevo template #${id}` : undefined }),
  },
})

export const brevoSender = defineType({
  name: 'brevoSender',
  title: 'Brevo sender',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [idField, nameField, defineField({ name: 'email', title: 'Email', type: 'string', readOnly: true })],
  components: { input: BrevoSenderInput },
  preview: {
    select: { id: 'id', name: 'name', email: 'email' },
    prepare: ({ id, name, email }) => ({
      title: name || 'No sender',
      subtitle: [email, id ? `#${id}` : undefined].filter(Boolean).join(' · ') || undefined,
    }),
  },
})

export const brevoSegment = defineType({
  name: 'brevoSegment',
  title: 'Brevo segment',
  type: 'object',
  icon: FilterIcon,
  fields: [idField, nameField],
  components: { input: BrevoSegmentInput },
  preview: {
    select: { id: 'id', name: 'name' },
    prepare: ({ id, name }) => ({ title: name || 'No segment', subtitle: id ? `Brevo segment #${id}` : undefined }),
  },
})

/** A yes/no contact attribute, e.g. WB_NEWSLETTER. Keyed on its name: Brevo attributes have no id. */
export const brevoAttribute = defineType({
  name: 'brevoAttribute',
  title: 'Brevo attribute',
  type: 'object',
  icon: TagIcon,
  fields: [defineField({ name: 'name', title: 'Attribute name in Brevo', type: 'string', readOnly: true })],
  components: { input: BrevoAttributeInput },
  preview: {
    select: { name: 'name' },
    prepare: ({ name }) => ({ title: name || 'No attribute', subtitle: name ? 'Brevo attribute' : undefined }),
  },
})
