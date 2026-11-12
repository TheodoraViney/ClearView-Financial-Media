import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { brevoSenderField } from '../fields'

/*
 * Who hears about a new signup, one document with the fixed id `SIGNUP_NOTIFICATION_SETTINGS_ID` from
 * `src/brands.ts`, opened from Forms in the Studio: the team's addresses and the Brevo sender the notification comes
 * from. The id has a dot on purpose, so the public dataset API cannot read the team's addresses; the server reads
 * it with the read token (src/lib/signup-notification.ts). None of it reaches the browser.
 */

export const signupNotificationSettings = defineType({
  name: 'signupNotificationSettings',
  title: 'Signup notifications',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'notifyEmails',
      title: 'Notify on new signups',
      type: 'array',
      description:
        'When a reader confirms a signup or adds new interests through a subscribe form, a short email with their details goes to these addresses. Leave empty to send nothing.',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required().email() })],
      // Unique ignoring case and spaces, so one inbox is not listed twice.
      validation: (Rule) =>
        Rule.custom((emails: string[] | undefined) => {
          const normalised = (emails ?? []).map((email) => email.trim().toLowerCase())
          return new Set(normalised).size === normalised.length ? true : 'Each address only once.'
        }),
    }),
    brevoSenderField('notifySender', {
      title: 'Notification sender',
      description: 'Who the notification email comes from. Only active senders in Brevo → Senders appear.',
      requiredWhen: ({ document }) => Array.isArray(document?.notifyEmails) && document.notifyEmails.length > 0,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Signup notifications', media: EnvelopeIcon }),
  },
})
