import { SparklesIcon } from '@sanity/icons/Sparkles'
import { defineField, defineType } from 'sanity'

import { BRIEF_INSTRUCTIONS_DEFAULT } from '@/lib/brief-instructions'

/*
 * The editorial instructions the "Generate brief" button on a post sends to the AI, one document for every brand
 * with the fixed id BRIEF_SETTINGS_ID (src/lib/brief-prompt.ts), opened from Articles in the Studio. The technical
 * rules (plain text, length, answer format) are added in code.
 */
export const briefSettings = defineType({
  name: 'briefSettings',
  title: 'Brief instructions',
  type: 'document',
  icon: SparklesIcon,
  fields: [
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 30,
      description:
        'How the AI writes a News in Brief text: the five sentences and their order, which facts to use, and the house style. Used by the Generate brief button on every post, on every brand, once published. Rules for plain text, length and the answer format are added automatically.',
      initialValue: BRIEF_INSTRUCTIONS_DEFAULT,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Brief instructions', media: SparklesIcon }),
  },
})
