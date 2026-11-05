import { EnvelopeIcon } from '@sanity/icons/Envelope'
import {
  type ConditionalPropertyCallback,
  defineArrayMember,
  defineField,
  defineType,
  type ReferenceFilterResolver,
} from 'sanity'

import { isEditorialBrandKey } from '@/brands'
import { isLockedStatus } from '@/lib/newsletter-status'

import { brevoSegmentField } from '../fields'

const STATUS_OPTIONS = [
  { title: 'Draft', value: 'draft' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Sent', value: 'sent' },
  { title: 'Cancelled', value: 'cancelled' },
]

// The Brevo account timezone. Sanity stores datetimes as UTC ISO strings; this only sets what the editor sees and types.
const UK_TIME = { displayTimeZone: 'Europe/London', allowTimeZoneSwitch: false }

const lockedByStatus: ConditionalPropertyCallback = ({ document }) => isLockedStatus(document?.status)

const LOCKED_NOTE = 'Locked once the issue is scheduled or sent; use Cancel to change a scheduled issue.'

// Published posts of the issue's own brand. An issue without a brand matches nothing.
// The picker searches through a perspective, where every `_id` is already the published id,
// so a `drafts.**` id filter would match nothing. The `published` perspective hides
// never-published posts and reads `brands` from the live version of a post with a pending draft.
const postsOfIssueBrand: ReferenceFilterResolver = ({ document }) => ({
  filter: '$brand in brands',
  params: { brand: (document as { brand?: string }).brand ?? '' },
  perspective: 'published',
})

/**
 * One daily email of an editorial publication, sent as a Brevo email campaign.
 *
 * Created only inside a publication folder, whose template sets `brand`.
 * The Sending fields are written by the server from Brevo's answers and are
 * read-only in Studio.
 */
export const newsletterIssue = defineType({
  name: 'newsletterIssue',
  title: 'Newsletter issue',
  type: 'document',
  icon: EnvelopeIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'sending', title: 'Sending' },
  ],
  fields: [
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      group: 'content',
      hidden: true,
      validation: (Rule) =>
        Rule.required().custom((value) =>
          !value || isEditorialBrandKey(value)
            ? true
            : 'Create the issue inside a publication folder',
        ),
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'string',
      group: 'content',
      description: `The email subject line. ${LOCKED_NOTE}`,
      readOnly: lockedByStatus,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'posts',
      title: 'Posts',
      type: 'array',
      group: 'content',
      description: `A new issue starts with the latest articles; use Refresh articles before sending if the issue was created earlier. The order here is the order in the email. ${LOCKED_NOTE}`,
      readOnly: lockedByStatus,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: { filter: postsOfIssueBrand, disableNew: true },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    brevoSegmentField('segment', {
      title: 'Segment',
      description: `The Brevo segment that gets this issue, for example the publication's newsletter readers. To try an issue first, pick a small test segment. ${LOCKED_NOTE}`,
      group: 'sending',
      readOnly: lockedByStatus,
      required: true,
    }),
    defineField({
      name: 'scheduledAt',
      title: 'Scheduled for',
      type: 'datetime',
      group: 'sending',
      description: `UK time. Set a date and time, then use Schedule. Leave empty to send with Send now. ${LOCKED_NOTE}`,
      options: UK_TIME,
      readOnly: lockedByStatus,
      // Checked only before scheduling: a scheduled or sent issue keeps its date once it has passed.
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (!value || isLockedStatus(context.document?.status)) {
            return true
          }

          return new Date(value).getTime() > Date.now() ? true : 'Choose a time in the future'
        }),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'sending',
      readOnly: true,
      options: { list: STATUS_OPTIONS },
      initialValue: 'draft',
      description: 'Set by the server when the issue is scheduled, sent or cancelled.',
    }),
    defineField({
      name: 'sentAt',
      title: 'Sent at',
      type: 'datetime',
      group: 'sending',
      readOnly: true,
      options: UK_TIME,
      description: 'UK time. Set by the server when Brevo sends the campaign.',
    }),
    defineField({
      name: 'brevoCampaignId',
      title: 'Brevo campaign id',
      type: 'number',
      group: 'sending',
      readOnly: true,
      description: 'Set by the server when the campaign is created in Brevo. Brevo → Campaigns → Email.',
    }),
    // Server-only lock against double sends: /api/newsletter/* sets it before any Brevo call and clears it after.
    // A value older than two minutes is treated as stale (a crashed request). Never shown or edited in Studio.
    defineField({
      name: 'sendingStartedAt',
      title: 'Sending started at',
      type: 'datetime',
      group: 'sending',
      hidden: true,
      readOnly: true,
    }),
    // Server-only double-send marker: written just before Brevo's sendNow, cleared once the outcome is known. While it
    // is under ten minutes old and Brevo still reports the campaign as a draft, Send and Schedule refuse.
    defineField({
      name: 'sendRequestedAt',
      title: 'Send requested at',
      type: 'datetime',
      group: 'sending',
      hidden: true,
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Created, newest first',
      name: 'createdAtDesc',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'subject',
      status: 'status',
      scheduledAt: 'scheduledAt',
      sentAt: 'sentAt',
    },
    prepare({ title, status, scheduledAt, sentAt }) {
      // A date typed into a draft is not scheduled yet, so it is not shown.
      const when = status === 'sent' ? sentAt : status === 'scheduled' ? scheduledAt : undefined
      const date =
        typeof when === 'string'
          ? new Date(when).toLocaleString('en-GB', {
              timeZone: 'Europe/London',
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : undefined
      const label = STATUS_OPTIONS.find((option) => option.value === status)?.title ?? 'Draft'

      return {
        title: title || 'Untitled issue',
        subtitle: [label, date].filter(Boolean).join(' · '),
      }
    },
  },
})
