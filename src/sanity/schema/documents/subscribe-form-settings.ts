import { CogIcon } from '@sanity/icons/Cog'
import { defineType } from 'sanity'

import { brevoListField, brevoTemplateField } from '../fields'

/*
 * What every subscribe form shares, one document with the fixed id `SUBSCRIBE_FORM_SETTINGS_ID` from
 * `src/brands.ts`, opened from Forms in the Studio: the Brevo list readers join and the confirmation email. Neither
 * reaches the browser. The pop-up's Country and Industry lists come from Brevo itself.
 */

export const subscribeFormSettings = defineType({
  name: 'subscribeFormSettings',
  title: 'Subscribe form settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    brevoListField('list', {
      title: 'Brevo list',
      description: 'Every reader who signs up through a subscribe form is added to this list.',
      required: true,
    }),
    brevoTemplateField('confirmationTemplate', {
      title: 'Confirmation email',
      description:
        'The Brevo email that asks new readers to confirm their address before they are signed up. Only templates tagged optin in Brevo appear.',
      required: true,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Subscribe form settings', media: CogIcon }),
  },
})
