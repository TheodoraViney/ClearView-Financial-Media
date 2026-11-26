import { HomeIcon } from '@sanity/icons/Home'
import { defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'
import { paragraphsBlock } from '../objects/rich-text'

/**
 * The head of a page's main column: breadcrumb (Home / this page), the H1 and the intro (bold, italic and links). Goes in the main
 * column of a Two columns block, or at the top of the Company Engagement page, which has no right column and shows no
 * breadcrumb. The title is the page's H1, so it is plain text, not a heading field.
 */

// The breadcrumb shows unless it is switched off; blocks stored before the switch have no value and keep it.
const withoutBreadcrumb = (parent: unknown) => (parent as { showBreadcrumb?: boolean } | undefined)?.showBreadcrumb === false
export const pageHero = defineType({
  name: 'pageHero',
  title: 'Page heading',
  type: 'object',
  icon: HomeIcon,
  fieldsets: [{ name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } }],
  fields: [
    adminLabelField,
    defineField({
      name: 'showBreadcrumb',
      title: 'Show breadcrumb',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'breadcrumbHomeLabel',
      title: 'Home label',
      type: 'string',
      fieldset: 'breadcrumb',
      initialValue: 'Home',
      hidden: ({ parent }) => withoutBreadcrumb(parent),
      validation: (Rule) =>
        Rule.custom((value, context) =>
          value || withoutBreadcrumb(context.parent) ? true : 'Required while the breadcrumb shows',
        ),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'This page label',
      type: 'string',
      fieldset: 'breadcrumb',
      hidden: ({ parent }) => withoutBreadcrumb(parent),
      validation: (Rule) =>
        Rule.custom((value, context) =>
          value || withoutBreadcrumb(context.parent) ? true : 'Required while the breadcrumb shows',
        ),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "The page's H1.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      of: [paragraphsBlock],
      validation: (Rule) =>
        Rule.custom((value: unknown) =>
          Array.isArray(value) &&
          value.some((block: { children?: { text?: string }[] }) =>
            (block?.children ?? []).some((child) => (child?.text ?? '').trim() !== ''),
          )
            ? true
            : 'Enter the intro',
        ),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', title: 'title' },
    prepare({ adminLabel, title }) {
      return { title: adminLabel || title || 'Page heading', subtitle: 'Page heading', media: HomeIcon }
    },
  },
})
