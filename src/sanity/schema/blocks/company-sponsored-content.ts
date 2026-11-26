import { DocumentsIcon } from '@sanity/icons/Documents'
import { defineType } from 'sanity'

import { adminLabelField } from '../fields'
import {
  label,
  onCompanyEngagementPage,
  PAGE_ONLY_MESSAGE,
  paginationLabels,
  sectionHeading,
  sectionIntro,
} from './company-engagement-fields'

/**
 * The Company Engagement page's sponsored and contributed content: posts on any editorial brand with a sponsor or a
 * contributor company, in two groups, newest first, each paged on its own. The cards come from the posts; a group is
 * hidden while it has none, and the block while both are empty.
 */
export const companySponsoredContent = defineType({
  name: 'companySponsoredContent',
  title: 'Company sponsored content',
  type: 'object',
  icon: DocumentsIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) => (onCompanyEngagementPage(context.document) ? true : PAGE_ONLY_MESSAGE)),
  fieldsets: [
    // A group is hidden while no post has a sponsor (or a contributor).
    { name: 'sponsored', title: 'Sponsored group', options: { collapsible: true, collapsed: true, columns: 3 } },
    { name: 'contributed', title: 'Contributed group', options: { collapsible: true, collapsed: true, columns: 3 } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    sectionHeading('Sponsored content', 'The block is hidden while no post names a sponsor or a contributor.'),
    sectionIntro(
      'Sponsored content is paid for by the named company. Contributed content is written by the named organisation and published by WealthBriefing.',
    ),
    label('sponsoredGroupLabel', 'Group label', undefined, 'Sponsored content', 'sponsored'),
    label('sponsoredMetaLabel', 'Card type label', 'The year is added after it.', 'Sponsored', 'sponsored'),
    label('sponsoredCtaLabel', 'Card link', undefined, 'Read sponsored content', 'sponsored'),
    label('contributedGroupLabel', 'Group label', undefined, 'Contributed content', 'contributed'),
    label('contributedMetaLabel', 'Card type label', 'The year is added after it.', 'Contributed', 'contributed'),
    label('contributedCtaLabel', 'Card link', undefined, 'Read contributed content', 'contributed'),
    ...paginationLabels('pagination'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      const text = Array.isArray(heading) ? heading[0]?.children?.[0]?.text : undefined

      return { title: adminLabel || text || 'Company sponsored content', subtitle: 'Company Engagement page', media: DocumentsIcon }
    },
  },
})
