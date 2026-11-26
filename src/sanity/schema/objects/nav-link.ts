import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

import { LINK_HUBS } from '@/lib/links'

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
      validation: (Rule) => Rule.required(),
    }),
    // `label` above is the visible text, so the link carries no label of its own. Header and footer menus link to
    // pages only, which keeps the document search short (one Contact page per brand, no events or awards that
    // mention the word); the listings have their own link type and anything else takes a web address.
    linkField({ required: true, withLabel: false, documentTypes: ['page'] }),
  ],
  preview: {
    select: {
      label: 'label',
      kind: 'link.kind',
      external: 'link.external',
      hub: 'link.hub',
      internalTitle: 'link.internal.title',
    },
    prepare({ label, kind, external, hub, internalTitle }) {
      const target =
        kind === 'external'
          ? external
          : kind === 'hub'
            ? LINK_HUBS.find((candidate) => candidate.value === hub)?.title
            : internalTitle

      return {
        title: label || 'Untitled link',
        subtitle: target ? `→ ${target}` : 'No target',
        media: LinkIcon,
      }
    },
  },
})
