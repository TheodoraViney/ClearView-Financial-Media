/**
 * The enquiry form's fields, in display order. The set is fixed in code (it is what a submission will carry); the
 * labels come from the block. `label` is only the Studio initial value of the label field, never rendered.
 * Which fields are required is fixed here too: the design shows no markers, so first name, last name, email and
 * message are required as on the Contact design and the legacy contact form.
 */
export const ENQUIRY_FORM_FIELDS = [
  { name: 'firstName', labelField: 'firstNameLabel', label: 'First name', required: true, type: 'text', autoComplete: 'given-name' },
  { name: 'lastName', labelField: 'lastNameLabel', label: 'Last name', required: true, type: 'text', autoComplete: 'family-name' },
  { name: 'email', labelField: 'emailLabel', label: 'Email', required: true, type: 'email', autoComplete: 'email' },
  { name: 'company', labelField: 'companyLabel', label: 'Company', required: false, type: 'text', autoComplete: 'organization' },
  { name: 'jobTitle', labelField: 'jobTitleLabel', label: 'Job title', required: false, type: 'text', autoComplete: 'organization-title' },
  { name: 'message', labelField: 'messageLabel', label: 'Message', required: true, type: 'textarea', autoComplete: 'off' },
] as const

export type EnquiryFormField = (typeof ENQUIRY_FORM_FIELDS)[number]

export type EnquiryFormFieldName = EnquiryFormField['name']
