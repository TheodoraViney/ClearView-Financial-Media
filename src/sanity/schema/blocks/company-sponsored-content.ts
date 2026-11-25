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
    { name: 'sponsored', title: 'Sponsored group', options: { collapsible: true, collapsed: true } },
    { name: 'contributed', title: 'Contributed group', options: { collapsible: true, collapsed: true } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    sectionHeading('Sponsored content', 'Hidden with the block when no post names a sponsor or a contributor.'),
    sectionIntro(
      'Sponsored content is paid for by the named company. Contributed content is written by the named organisation and published by WealthBriefing.',
    ),
    label('sponsoredGroupLabel', 'Group label', 'Above the posts with a sponsor. Hidden with the group.', 'Sponsored content', 'sponsored'),
    label('sponsoredMetaLabel', 'Card type label', 'Top right of each sponsored post card, before the year.', 'Sponsored', 'sponsored'),
    label('sponsoredCtaLabel', 'Card link', 'Bottom of each sponsored post card, opening the post.', 'Read sponsored content', 'sponsored'),
    label(
      'contributedGroupLabel',
      'Group label',
      'Above the posts with a contributor. Hidden with the group.',
      'Contributed content',
      'contributed',
    ),
    label('contributedMetaLabel', 'Card type label', 'Top right of each contributed post card, before the year.', 'Contributed', 'contributed'),
    label(
      'contributedCtaLabel',
      'Card link',
      'Bottom of each contributed post card, opening the post.',
      'Read contributed content',
      'contributed',
    ),
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
