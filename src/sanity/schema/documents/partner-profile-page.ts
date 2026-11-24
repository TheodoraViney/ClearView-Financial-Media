import { CaseIcon } from '@sanity/icons/Case'
import { defineField, defineType } from 'sanity'

import {
  COMPANY_NAME_TOKEN,
  hasTokenOnce,
  type PartnerProfilePageCopyKey,
  SPONSOR_TITLE_TOKEN,
} from '@/lib/partner-profile-copy'

import { headingField, linkField } from '../fields'

/*
 * The company profile template's labels (the user-facing name; partner profile stays the technical one): one document with the fixed id PARTNER_PROFILE_PAGE_ID from `src/brands.ts`,
 * opened from the ClearView folder in the Studio, because company pages (/companies/{slug}) live on ClearView
 * Publishing only. The company's own content (image, description, figures, rows, links) lives on the company document;
 * its activity and recognition come from the awards editions and events that name it. The design texts are the fields'
 * initial values only: the page renders what is stored. Screen-reader-only text stays in code.
 */

const label = (
  name: PartnerProfilePageCopyKey,
  title: string,
  description: string,
  initialValue: string,
  validation?: (value: string | undefined) => true | string,
) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    initialValue,
    validation: (Rule) => (validation ? Rule.required().custom(validation) : Rule.required()),
  })

const heading = (name: string, title: string, description: string, initialText: string, defaultLevel: 'h2' | 'h3' = 'h2') =>
  headingField(name, {
    title,
    defaultLevel,
    initialText,
    required: true,
    description: `${description} Choose the heading level in the style menu. The size on the page stays the same.`,
  })

const HIDDEN = 'Hidden when the company has none.'

export const partnerProfilePage = defineType({
  name: 'partnerProfilePage',
  title: 'Company profile page',
  type: 'document',
  icon: CaseIcon,
  fields: [
    label('breadcrumbHomeLabel', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.', 'Home'),
    label(
      'breadcrumbProfileLabel',
      'Breadcrumb section label',
      'Second item of the breadcrumb, between the home page and the company name.',
      'Industry Engagement',
    ),
    linkField({
      name: 'breadcrumbProfileLink',
      title: 'Breadcrumb section link',
      description: 'Optional. Where the second item of the breadcrumb links to. Without a link it shows as grey text.',
      withLabel: false,
    }),
    label('typeLabel', 'Type label', 'Shown above the company name.', 'Company profile'),
    label(
      'websiteLinkLabel',
      'Website link label',
      `Link to the company's website, under its description. ${COMPANY_NAME_TOKEN} is replaced with the company name. ${HIDDEN}`,
      `Visit ${COMPANY_NAME_TOKEN} website`,
      (value) =>
        !value || hasTokenOnce(value, COMPANY_NAME_TOKEN)
          ? true
          : `Use ${COMPANY_NAME_TOKEN} exactly once, where the company name goes`,
    ),
    label(
      'atAGlanceLabel',
      'At a glance label',
      'Name of the row of figures under the header, read out by screen readers. The row is hidden when the company has no figures.',
      'At a glance',
    ),
    heading('fieldsHeading', 'Clients and platform heading', `Heading above the company's label and value rows. ${HIDDEN}`, 'Clients and platform'),
    heading(
      'activityHeading',
      'Activity and recognition heading',
      'Heading of the section listing the awards and events the company sponsored or won. Hidden when there are none.',
      'WealthBriefing activity and recognition',
    ),
    heading(
      'sponsorActivityHeading',
      'Sponsor activity heading',
      'Smaller heading above the awards and events the company sponsored.',
      'Sponsor activity',
      'h3',
    ),
    label(
      'sponsorActivityText',
      'Sponsor activity line',
      `One line per sponsored awards edition or event. ${SPONSOR_TITLE_TOKEN} is replaced with its title.`,
      `Named as a sponsor of ${SPONSOR_TITLE_TOKEN}.`,
      (value) =>
        !value || hasTokenOnce(value, SPONSOR_TITLE_TOKEN)
          ? true
          : `Use ${SPONSOR_TITLE_TOKEN} exactly once, where the title goes`,
    ),
    heading('recognitionHeading', 'Recognition heading', 'Smaller heading above the awards the company won.', 'Recognition', 'h3'),
    heading(
      'coverageHeading',
      'Sponsor and editorial coverage heading',
      'Heading of the section with the sponsor interviews and the awards archive coverage. Hidden when the company has neither.',
      'Sponsor and editorial coverage',
    ),
    heading('sponsorInterviewsHeading', 'Sponsor interviews heading', 'Smaller heading above the sponsor interviews.', 'Sponsor interviews', 'h3'),
    heading(
      'archiveCoverageHeading',
      'Awards archive coverage heading',
      "Smaller heading above the company's awards archive titles.",
      'Awards archive coverage',
      'h3',
    ),
    label(
      'archiveLinkLabel',
      'Awards archive link label',
      'Text of the link under the awards archive titles.',
      'WealthBriefing Awards archive',
    ),
    linkField({
      name: 'archiveLink',
      title: 'Awards archive link',
      description:
        'Optional. Where the link under the awards archive titles goes, a page or a web address. Shown only with a link set, on companies with awards archive titles.',
      withLabel: false,
    }),
    heading('officialLinksHeading', 'Official links heading', `Heading above the company's own links. ${HIDDEN}`, 'Official links'),
  ],
  preview: {
    prepare() {
      return { title: 'Company profile page', media: CaseIcon }
    },
  },
})
