import { stegaClean } from 'next-sanity'

import { EnquiryForm as EnquiryFormSection } from '@/components/sections/EnquiryForm'
import { splitConsentText } from '@/lib/consent-text'
import { ANCHOR_ID, resolveHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

/**
 * The enquiry form. The anchor id is an attribute value, so it is cleaned; an invalid stored id falls back to the
 * block key so the section keeps a unique id. Labels and messages keep stega for click-to-edit; the privacy link goes
 * through resolveHref (scheme allowlist), and the consent text is split on its `{link}` token as on the Contact form.
 */
export function EnquiryForm({ block, brand }: BlockProps<'enquiryForm'>) {
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
      consent={{
        ...splitConsentText(block.consentText ?? ''),
        linkLabel: block.privacyLinkLabel ?? '',
        href: resolveHref(block.privacyLink, brand),
      }}
      submitLabel={block.submitLabel ?? ''}
      requiredMessage={block.requiredMessage ?? ''}
      invalidEmailMessage={block.invalidEmailMessage ?? ''}
      consentError={block.consentError ?? ''}
      sendError={block.sendErrorMessage ?? ''}
      successMessage={block.successMessage ?? ''}
      returnLabel={block.returnLabel ?? ''}
    />
  )
}
