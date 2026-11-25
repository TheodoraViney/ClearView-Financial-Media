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
    { name: 'cards', title: 'Cards', options: { collapsible: true, collapsed: true } },
    { name: 'pagination', title: 'Pagination', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    adminLabelField,
    sectionHeading('Winners and awards sponsors', 'Hidden with the block when no awards edition names a company.'),
    sectionIntro(
      'Historical sponsor records from 2016 awards material. These are not current sponsorships. Winner records will be added as verified company records are published.',
    ),
    label('winnerLabel', 'Winner tag', 'Tag on a card when the company won there, before the categories it won.', 'Winner', 'cards'),
    label('awardsSponsorLabel', 'Awards sponsor tag', 'Tag on a card when the company sponsored the edition.', 'Awards sponsor', 'cards'),
    label('charityPartnerLabel', 'Charity partner tag', 'Tag on a card when the company was a charity partner.', 'Charity partner', 'cards'),
    label('metaLabel', 'Card type label', 'Top right of each card, before the year.', 'Award', 'cards'),
    label('ctaLabel', 'Card link', 'Bottom of each card, opening the awards edition.', 'View award', 'cards'),
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
