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
  fields: [
    adminLabelField,
    defineField({
      name: 'showBreadcrumb',
      title: 'Show breadcrumb',
      type: 'boolean',
      description: 'Off: the title takes the breadcrumb\'s place.',
      initialValue: true,
    }),
    defineField({
      name: 'breadcrumbHomeLabel',
      title: 'Breadcrumb home label',
      type: 'string',
      description: 'First item of the breadcrumb, linking to the home page.',
      initialValue: 'Home',
      hidden: ({ parent }) => withoutBreadcrumb(parent),
      validation: (Rule) =>
        Rule.custom((value, context) =>
          value || withoutBreadcrumb(context.parent) ? true : 'Required while the breadcrumb shows',
        ),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'Breadcrumb current label',
      type: 'string',
      description: 'Last item of the breadcrumb: this page.',
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
      description: "The page's main heading (H1).",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      of: [paragraphsBlock],
      description: 'Text under the title. Bold, italic and links.',
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
