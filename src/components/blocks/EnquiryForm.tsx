import { stegaClean } from 'next-sanity'

import { EnquiryForm as EnquiryFormSection } from '@/components/sections/EnquiryForm'
import { ANCHOR_ID } from '@/lib/links'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

/**
 * The enquiry form. The anchor id is an attribute value, so it is cleaned; an invalid stored id falls back to the
 * block key so the section keeps a unique id. Labels and messages keep stega for click-to-edit.
 */
export function EnquiryForm({ block }: BlockProps<'enquiryForm'>) {
  const anchor = stegaClean(block.anchorId)?.trim() ?? ''

  return (
    <EnquiryFormSection
      anchorId={ANCHOR_ID.test(anchor) ? anchor : block._key}
      heading={toHeading(block.heading)}
      labels={{
        firstName: block.firstNameLabel ?? '',
        lastName: block.lastNameLabel ?? '',
        email: block.emailLabel ?? '',
        company: block.companyLabel ?? '',
        jobTitle: block.jobTitleLabel ?? '',
        message: block.messageLabel ?? '',
      }}
      submitLabel={block.submitLabel ?? ''}
      requiredMessage={block.requiredMessage ?? ''}
      invalidEmailMessage={block.invalidEmailMessage ?? ''}
    />
  )
}
