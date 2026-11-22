import { HONEYPOT_FIELD } from './honeypot'

/**
 * The fields of the site's own forms, one named set per form, each in display order. A set is fixed in code (it is
 * what a submission carries to Jotform, see src/lib/enquiry-server.ts); the labels come from the block. `labelField`
 * is the block's label field and `label` only its Studio initial value and its row name in the team's notification
 * email, never rendered on the site. Which fields are required, and each one's longest value (the input's maxLength
 * and the server's limit), are fixed here too. Every form also has a required consent box, outside the set.
 *
 * - `sponsorship`: the Enquiry form block (`enquiryForm`), in the design's order. Company and job title are required
 *   (client, 2026-11-18), as on the Jotform form; the message is required as on the Contact design.
 * - `contact`: the Contact form block (`contactForm`), as the Contact design v1.2 without the file attachment, plus
 *   the required job title, in the Jotform form's order (name, job title, company, email, phone, message).
 */
export const FORM_FIELD_SETS = {
  sponsorship: [
    { name: 'firstName', labelField: 'firstNameLabel', label: 'First name', required: true, type: 'text', autoComplete: 'given-name', maxLength: 100 },
    { name: 'lastName', labelField: 'lastNameLabel', label: 'Last name', required: true, type: 'text', autoComplete: 'family-name', maxLength: 100 },
    { name: 'email', labelField: 'emailLabel', label: 'Email', required: true, type: 'email', autoComplete: 'email', maxLength: 254 },
    { name: 'company', labelField: 'companyLabel', label: 'Company', required: true, type: 'text', autoComplete: 'organization', maxLength: 200 },
    { name: 'jobTitle', labelField: 'jobTitleLabel', label: 'Job title', required: true, type: 'text', autoComplete: 'organization-title', maxLength: 200 },
    { name: 'message', labelField: 'messageLabel', label: 'Message', required: true, type: 'textarea', autoComplete: 'off', maxLength: 5000 },
  ],
  contact: [
    { name: 'firstName', labelField: 'firstNameLabel', label: 'First name', required: true, type: 'text', autoComplete: 'given-name', maxLength: 100 },
    { name: 'lastName', labelField: 'lastNameLabel', label: 'Last name', required: true, type: 'text', autoComplete: 'family-name', maxLength: 100 },
    { name: 'jobTitle', labelField: 'jobTitleLabel', label: 'Job title', required: true, type: 'text', autoComplete: 'organization-title', maxLength: 200 },
    { name: 'company', labelField: 'companyLabel', label: 'Company', required: true, type: 'text', autoComplete: 'organization', maxLength: 200 },
    { name: 'email', labelField: 'emailLabel', label: 'Email', required: true, type: 'email', autoComplete: 'email', maxLength: 254 },
    { name: 'phone', labelField: 'phoneLabel', label: 'Phone', required: false, type: 'tel', autoComplete: 'tel', maxLength: 50 },
    { name: 'message', labelField: 'messageLabel', label: 'Message', required: true, type: 'textarea', autoComplete: 'off', maxLength: 5000 },
  ],
} as const

export type FormFieldSetName = keyof typeof FORM_FIELD_SETS

export type FormFieldSpec<S extends FormFieldSetName = FormFieldSetName> = (typeof FORM_FIELD_SETS)[S][number]

export type FormFieldName<S extends FormFieldSetName = FormFieldSetName> = FormFieldSpec<S>['name']

/** The Enquiry form block's set (Sponsorship). */
export const ENQUIRY_FORM_FIELDS = FORM_FIELD_SETS.sponsorship

export type EnquiryFormField = FormFieldSpec<'sponsorship'>

export type EnquiryFormFieldName = FormFieldName<'sponsorship'>

/** The Contact form block's set. */
export const CONTACT_FORM_FIELDS = FORM_FIELD_SETS.contact

export type ContactFormFieldName = FormFieldName<'contact'>

// ---------------------------------------------------------------------------------------------------------------
// The forms' request and answer, shared by the two browser forms and the `POST /api/enquiry` route.

export const ENQUIRY_ENDPOINT = '/api/enquiry'

/**
 * What a form posts, as JSON: which form, its set's fields as typed (empty optional ones may be left out), the
 * consent box and the honeypot (empty for people). The brand comes from the
 * Host, never from the body.
 */
export type EnquiryRequest = { form: FormFieldSetName; consent: boolean } & Partial<Record<FormFieldName, string>> & {
  [HONEYPOT_FIELD]?: string
}

/** The route's answer. `invalid` means the server refused a field the browser should have caught. */
export type EnquiryResponse = { status: 'success' } | { status: 'error'; reason: 'invalid' | 'failed' }

/**
 * Posts a validated form. True once the enquiry is stored; false on any failure, a firewall 429 or a network error
 * included. Field values are read from the form data by the set's names.
 */
export async function sendEnquiry(form: FormFieldSetName, data: FormData): Promise<boolean> {
  const value = (name: string) => {
    const entry = data.get(name)

    return typeof entry === 'string' ? entry.trim() : ''
  }

  const request: EnquiryRequest = {
    form,
    ...Object.fromEntries(FORM_FIELD_SETS[form].map(({ name }) => [name, value(name)])),
    consent: data.get('consent') !== null,
    [HONEYPOT_FIELD]: value(HONEYPOT_FIELD),
  }

  try {
    const response = await fetch(ENQUIRY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
    const answer = (await response.json().catch(() => null)) as EnquiryResponse | null

    return answer?.status === 'success'
  } catch {
    return false
  }
}
