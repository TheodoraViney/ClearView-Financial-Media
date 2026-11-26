import { CaseIcon } from '@sanity/icons/Case'
import { defineField, defineType } from 'sanity'

import {
  COMPANY_NAME_TOKEN,
  hasTokenOnce,
  type PartnerProfilePageCopyKey,
  SPONSOR_TITLE_TOKEN,
} from '@/lib/partner-profile-copy'

import { linkField } from '../fields'

/*
 * "Company page texts": the company profile template's labels (partner profile stays the technical name), one
 * document with the fixed id PARTNER_PROFILE_PAGE_ID from `src/brands.ts`, opened from the Companies folder in the
 * Studio. Company pages (/companies/{slug}) live on ClearView Publishing only. The company's own content (image,
 * description, figures, rows, links) lives on the company document; its activity and recognition come from the awards
 * editions and events that name it.
 * Tabs and fieldsets follow the page from top to bottom. Section headings are plain strings rendered as h2; the
 * subheadings inside Activity and Coverage render as h3.
 * The design texts are the fields' initial values only: the page renders what is stored. Screen-reader-only text
 * stays in code.
 */

type FieldOptions = {
  description?: string
  fieldset?: string
  group?: string
  validation?: (value: string | undefined) => true | string
}

const label = (name: PartnerProfilePageCopyKey, title: string, initialValue: string, options: FieldOptions = {}) => {
  const { validation, ...rest } = options

  return defineField({
    name,
    title,
    type: 'string',
    initialValue,
    validation: (Rule) => (validation ? Rule.required().custom(validation) : Rule.required()),
    group: 'sections',
    ...rest,
  })
}

const heading = (name: string, title: string, initialValue: string, options: Omit<FieldOptions, 'validation'> = {}) =>
  defineField({ name, title, type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

export const partnerProfilePage = defineType({
  name: 'partnerProfilePage',
  title: 'Company page texts',
  type: 'document',
  icon: CaseIcon,
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'sections', title: 'Sections' },
  ],
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', options: { columns: 2 } },
    { name: 'activity', title: 'Activity and recognition', options: { columns: 2 } },
    { name: 'coverage', title: 'Sponsor and editorial coverage', options: { columns: 2 } },
  ],
  fields: [
    // Header
    label('breadcrumbHomeLabel', 'Home', 'Home', { group: 'header', fieldset: 'breadcrumb' }),
    label('breadcrumbProfileLabel', 'Section', 'Industry Engagement', { group: 'header', fieldset: 'breadcrumb' }),
    linkField({
      name: 'breadcrumbProfileLink',
      title: 'Breadcrumb section link',
      description: 'Optional. Without a link the section shows as grey text.',
      group: 'header',
      withLabel: false,
    }),
    label('typeLabel', 'Type label', 'Company profile', { group: 'header' }),
    label('websiteLinkLabel', 'Website link', `Visit ${COMPANY_NAME_TOKEN} website`, {
      group: 'header',
      description: `${COMPANY_NAME_TOKEN} becomes the company name.`,
      validation: (value) =>
        !value || hasTokenOnce(value, COMPANY_NAME_TOKEN) ? true : `Use ${COMPANY_NAME_TOKEN} exactly once, where the company name goes`,
    }),
    label('atAGlanceLabel', 'Figures row name', 'At a glance', {
      group: 'header',
      description: 'Read by screen readers, not shown.',
    }),

    // Sections, in page order. A section is hidden while the company has nothing for it.
    heading('fieldsHeading', 'Clients and platform heading', 'Clients and platform'),

    heading('activityHeading', 'Heading', 'WealthBriefing activity and recognition', { fieldset: 'activity' }),
    heading('sponsorActivityHeading', 'Sponsor subheading', 'Sponsor activity', { fieldset: 'activity' }),
    label('sponsorActivityText', 'Sponsor line', `Named as a sponsor of ${SPONSOR_TITLE_TOKEN}.`, {
      fieldset: 'activity',
      description: `One per sponsored edition or event. ${SPONSOR_TITLE_TOKEN} becomes its title.`,
      validation: (value) =>
        !value || hasTokenOnce(value, SPONSOR_TITLE_TOKEN) ? true : `Use ${SPONSOR_TITLE_TOKEN} exactly once, where the title goes`,
    }),
    heading('recognitionHeading', 'Recognition subheading', 'Recognition', { fieldset: 'activity' }),

    heading('coverageHeading', 'Heading', 'Sponsor and editorial coverage', { fieldset: 'coverage' }),
    heading('sponsorInterviewsHeading', 'Interviews subheading', 'Sponsor interviews', { fieldset: 'coverage' }),
    heading('archiveCoverageHeading', 'Archive subheading', 'Awards archive coverage', { fieldset: 'coverage' }),
    label('archiveLinkLabel', 'Archive link text', 'WealthBriefing Awards archive', { fieldset: 'coverage' }),
    linkField({
      name: 'archiveLink',
      title: 'Awards archive link',
      description: 'Optional. The link under the archive titles shows only when set.',
      group: 'sections',
      withLabel: false,
    }),

    heading('officialLinksHeading', 'Official links heading', 'Official links'),
  ],
  preview: {
    prepare() {
      return { title: 'Company page texts', media: CaseIcon }
    },
  },
})
