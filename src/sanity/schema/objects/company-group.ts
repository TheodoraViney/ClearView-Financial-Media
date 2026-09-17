import { CaseIcon } from '@sanity/icons/Case'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * A named list of Companies.
 *
 * Covers `cyph_sponsor_types` on Events (76 records, sponsor tier plus
 * sponsors) and `partner_category` on Resources (13 rows, partner tier plus
 * partners). Sponsor is a role a Company plays here, not a separate type, so
 * the Phase 2 entity layer stays open. See README section 5.
 */
export const companyGroup = defineType({
  name: 'companyGroup',
  title: 'Group of companies',
  type: 'object',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Group name',
      type: 'string',
      description: 'For example "Category Sponsors" or "Sponsors and Partners".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'companies',
      title: 'Companies',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'company' }] })],
      validation: (Rule) => Rule.unique().min(1),
    }),
  ],
  preview: {
    select: { name: 'name', count: 'companies' },
    prepare({ name, count }) {
      const companies = (count as unknown[] | undefined)?.length ?? 0

      return {
        title: name || 'Unnamed group',
        subtitle: `${companies} ${companies === 1 ? 'company' : 'companies'}`,
      }
    },
  },
})
