import { StarIcon } from '@sanity/icons/Star'
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
 * The Company Engagement page's "Winners and awards sponsors": one card per awards edition and company (winners,
 * sponsors and charity partners), newest edition first. The cards come from the awards editions; the block is hidden
 * while there are none.
 */
export const companyAwards = defineType({
  name: 'companyAwards',
  title: 'Winners and awards sponsors',
  type: 'object',
  icon: StarIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) => (onCompanyEngagementPage(context.document) ? true : PAGE_ONLY_MESSAGE)),
  fieldsets: [
    { name: 'cards', title: 'Cards', options: { collapsible: true, collapsed: true, columns: 2 } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true, columns: 2 } },
  ],
  fields: [
    adminLabelField,
    sectionHeading('Winners and awards sponsors', 'The block is hidden while no awards edition names a company.'),
    sectionIntro(
      'Historical sponsor records from 2016 awards material. These are not current sponsorships. Winner records will be added as verified company records are published.',
    ),
    label('winnerLabel', 'Winner tag', 'The categories won are added after it.', 'Winner', 'cards'),
    label('awardsSponsorLabel', 'Awards sponsor tag', undefined, 'Awards sponsor', 'cards'),
    label('charityPartnerLabel', 'Charity partner tag', undefined, 'Charity partner', 'cards'),
    label('metaLabel', 'Card type label', 'The year is added after it.', 'Award', 'cards'),
    label('ctaLabel', 'Card link', undefined, 'View award', 'cards'),
    ...paginationLabels('pagination'),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading' },
    prepare({ adminLabel, heading }) {
      const text = Array.isArray(heading) ? heading[0]?.children?.[0]?.text : undefined

      return { title: adminLabel || text || 'Winners and awards sponsors', subtitle: 'Company Engagement page', media: StarIcon }
    },
  },
})
