import { defineField } from 'sanity'

import { isCompanyEngagementPageId } from '@/lib/company-engagement'
import { hasTokenOnce } from '@/lib/partner-profile-copy'

import { headingField } from '../fields'

/*
 * Fields and the page rule shared by the Company Engagement page's blocks (search and filters, company directory,
 * winners and awards sponsors, forum and summit partners, sponsored content). Every visible label is a required field
 * with the design text as its initial value: the page renders what is stored.
 */

/** Only the Company Engagement page's route gives these blocks their records and URL: elsewhere they render nothing. */
export const PAGE_ONLY_MESSAGE = 'This block works on the Company Engagement page only'

export const onCompanyEngagementPage = (document: unknown) =>
  isCompanyEngagementPageId((document as { _id?: string } | undefined)?._id)

/** A required one-line label. `validation` adds a check of the stored value, such as its placeholders. */
export const label = (
  name: string,
  title: string,
  description: string,
  initialValue: string,
  fieldset?: string,
  validation?: (value: string | undefined) => true | string,
) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    initialValue,
    fieldset,
    validation: (Rule) => (validation ? Rule.required().custom(validation) : Rule.required()),
  })

/** A check that each placeholder is used exactly once. */
export const tokensOnce =
  (...tokens: string[]) =>
  (value: string | undefined): true | string => {
    const missing = tokens.filter((token) => !hasTokenOnce(value ?? '', token))

    return !value || missing.length === 0 ? true : `Use ${missing.join(', ')} exactly once`
  }

/** A list section's heading: H2 by default, the size on the page fixed. */
export const sectionHeading = (initialText: string, description: string) =>
  headingField('heading', {
    defaultLevel: 'h2',
    initialText,
    required: true,
    description: `${description} Choose the heading level in the style menu. The size on the page stays the same.`,
  })

/** A list section's optional intro under its heading. */
export const sectionIntro = (initialValue?: string) =>
  defineField({
    name: 'intro',
    title: 'Intro',
    type: 'text',
    rows: 3,
    description: 'Optional. Under the heading.',
    initialValue,
  })

/** Previous and Next under a list, shown when it runs over more than one page (12 cards a page). */
export const paginationLabels = (fieldset?: string) => [
  label('previousLabel', 'Previous page button', 'Pagination, shown when the list runs over more than one page.', 'Previous', fieldset),
  label('nextLabel', 'Next page button', 'Pagination, shown when the list runs over more than one page.', 'Next', fieldset),
]
