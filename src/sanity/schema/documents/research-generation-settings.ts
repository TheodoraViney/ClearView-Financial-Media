import { SparklesIcon } from '@sanity/icons/Sparkles'
import { defineField, defineType } from 'sanity'

import { RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT } from '@/lib/research-generation-instructions'

/*
 * The editorial instructions the "Generate from report text" button on a research report sends to the AI, one
 * document for every brand with the fixed id RESEARCH_GENERATION_SETTINGS_ID (src/lib/research-generation-prompt.ts),
 * opened from Articles in the Studio next to the brief instructions. The technical rules (answer format, counts,
 * lengths, the number rule) are added in code. Only the published document is read: until it is published, or while its
 * instructions are empty, the button uses the default instructions (RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT).
 */
export const researchGenerationSettings = defineType({
  name: 'researchGenerationSettings',
  title: 'Research generation instructions',
  type: 'document',
  icon: SparklesIcon,
  fields: [
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 30,
      description:
        'How the AI drafts a research report page from its report text: what the summary, Executive Summary page, key findings, charts, insights and methodology are for, which facts to use, and the house style. Used by the Generate from report text button on every research report once published; until then the button uses the default text shown here. Rules for the answer format, counts, lengths and figures are added automatically.',
      initialValue: RESEARCH_GENERATION_INSTRUCTIONS_DEFAULT,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Research generation instructions', media: SparklesIcon }),
  },
})
