import { SparklesIcon } from '@sanity/icons/Sparkles'
import { defineField, defineType } from 'sanity'

import { INFOGRAPHIC_INSTRUCTIONS_DEFAULT } from '@/lib/infographic-instructions'

/*
 * The editorial instructions the infographic "Generate" button sends to the AI, one document for every brand with
 * the fixed id INFOGRAPHIC_SETTINGS_ID (src/lib/infographic-prompt.ts), opened from Articles in the Studio. The
 * technical rules (canvas, colours, allowed SVG, answer format) are added in code, because the site's SVG check
 * enforces them.
 */
export const infographicSettings = defineType({
  name: 'infographicSettings',
  title: 'Infographic instructions',
  type: 'document',
  icon: SparklesIcon,
  fields: [
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 30,
      description:
        'What the AI draws and how: which facts to use, the diagram types and when each fits, label length, tone, and how to write the title and description. Used by the Generate button on every infographic, on every brand, once published. Rules for sizes, colours and allowed SVG are added automatically.',
      initialValue: INFOGRAPHIC_INSTRUCTIONS_DEFAULT,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Infographic instructions', media: SparklesIcon }),
  },
})
