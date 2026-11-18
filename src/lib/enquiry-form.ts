/**
 * The fields of the site's own forms, one named set per form, each in display order. A set is fixed in code (it is
 * what a submission will carry); the labels come from the block. `labelField` is the block's label field and `label`
 * only its Studio initial value, never rendered. Which fields are required is fixed here too.
 *
 * - `sponsorship`: the Enquiry form block (`enquiryForm`). The design shows no markers, so first name, last name,
 *   email and message are required as on the Contact design and the legacy contact form.
 * - `contact`: the Contact form block (`contactForm`), as the Contact design v1.2 without the file attachment.
 */
export const FORM_FIELD_SETS = {
  sponsorship: [
    { name: 'firstName', labelField: 'firstNameLabel', label: 'First name', required: true, type: 'text', autoComplete: 'given-name' },
    { name: 'lastName', labelField: 'lastNameLabel', label: 'Last name', required: true, type: 'text', autoComplete: 'family-name' },
    { name: 'email', labelField: 'emailLabel', label: 'Email', required: true, type: 'email', autoComplete: 'email' },
    { name: 'company', labelField: 'companyLabel', label: 'Company', required: false, type: 'text', autoComplete: 'organization' },
    { name: 'jobTitle', labelField: 'jobTitleLabel', label: 'Job title', required: false, type: 'text', autoComplete: 'organization-title' },
    { name: 'message', labelField: 'messageLabel', label: 'Message', required: true, type: 'textarea', autoComplete: 'off' },
  ],
  contact: [
    { name: 'firstName', labelField: 'firstNameLabel', label: 'First name', required: true, type: 'text', autoComplete: 'given-name' },
    { name: 'lastName', labelField: 'lastNameLabel', label: 'Last name', required: true, type: 'text', autoComplete: 'family-name' },
    { name: 'email', labelField: 'emailLabel', label: 'Email', required: true, type: 'email', autoComplete: 'email' },
    { name: 'phone', labelField: 'phoneLabel', label: 'Phone', required: false, type: 'tel', autoComplete: 'tel' },
    { name: 'company', labelField: 'companyLabel', label: 'Company', required: false, type: 'text', autoComplete: 'organization' },
    { name: 'message', labelField: 'messageLabel', label: 'Message', required: true, type: 'textarea', autoComplete: 'off' },
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
