import { ContactForm as ContactFormSection } from '@/components/sections/ContactForm'
import { splitConsentText } from '@/lib/consent-text'
import { CONTACT_FORM_FIELDS, type ContactFormFieldName } from '@/lib/enquiry-form'
import { resolveHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

/**
 * The Contact page block. Every string comes from the block and keeps stega for click-to-edit; the privacy link goes
 * through resolveHref (scheme allowlist), and the consent text is split on its `{link}` token as in the pop-up.
 */
export function ContactForm({ block, brand }: BlockProps<'contactForm'>) {
  const labels = Object.fromEntries(
    CONTACT_FORM_FIELDS.map(({ name, labelField }) => [name, block[labelField] ?? '']),
  ) as Record<ContactFormFieldName, string>

  return (
    <ContactFormSection
      breadcrumb={[{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]}
      heading={toHeading(block.heading)}
      standfirst={block.standfirst ?? ''}
      image={toImage(block.image)}
      labels={labels}
      optionalMarker={block.optionalMarker ?? ''}
      consent={{
        ...splitConsentText(block.consentText ?? ''),
        linkLabel: block.privacyLinkLabel ?? '',
        href: resolveHref(block.privacyLink, brand),
      }}
      submitLabel={block.submitLabel ?? ''}
      errors={{
        firstName: block.firstNameError ?? '',
        lastName: block.lastNameError ?? '',
        emailMissing: block.emailMissingError ?? '',
        emailInvalid: block.emailInvalidError ?? '',
        message: block.messageError ?? '',
        consent: block.consentError ?? '',
      }}
      successMessage={block.successMessage ?? ''}
      returnLabel={block.returnLabel ?? ''}
    />
  )
}
