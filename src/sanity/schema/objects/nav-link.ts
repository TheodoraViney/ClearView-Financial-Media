import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

import { linkField } from '../fields'

/** One header menu item: visible text plus where it goes. */
export const navLink = defineType({
  name: 'navLink',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Menu text.',
      validation: (Rule) => Rule.required(),
    }),
    // `label` above is the visible text, so the link carries no label of its own.
    linkField({ required: true, withLabel: false }),
  ],
  preview: {
    select: {
      label: 'label',
      kind: 'link.kind',
      external: 'link.external',
      internalTitle: 'link.internal.title',
    },
    prepare({ label, kind, external, internalTitle }) {
      const target = kind === 'external' ? external : internalTitle

      return {
        title: label || 'Untitled link',
        subtitle: target ? `→ ${target}` : 'No target',
        media: LinkIcon,
      }
    },
  },
})
