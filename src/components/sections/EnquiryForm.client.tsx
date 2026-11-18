'use client'

import { type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'
import { FormFieldControl, useFieldValidation, validateFields } from '@/components/ui/FormFieldControl.client'
import { ENQUIRY_FORM_FIELDS, type EnquiryFormField, type EnquiryFormFieldName } from '@/lib/enquiry-form'

export type EnquiryFormFieldsProps = {
  labels: Record<EnquiryFormFieldName, string>
  submitLabel: string
  requiredMessage: string
  invalidEmailMessage: string
}

// Hover and focus rings as the design: 180ms ease-out.
const MOTION = 'out'

const FIELD_NAMES = ENQUIRY_FORM_FIELDS.map((field) => field.name)

/**
 * The enquiry form: two columns from 1200 (job title and message span both), one below; 24 × 32 gaps, 32 above the
 * submit, which is full width on mobile. Validates in the browser as the subscribe pop-up (`useFieldValidation`):
 * every error at once, focus on the first invalid field, each error clears once its field is valid again. Messages
 * come from the CMS: one for an empty required field, one for an invalid email.
 */
export function EnquiryFormFields({
  labels,
  submitLabel,
  requiredMessage,
  invalidEmailMessage,
  labelledBy,
}: EnquiryFormFieldsProps & { labelledBy?: string }) {
  const validate = (data: FormData) =>
    validateFields<EnquiryFormField>(ENQUIRY_FORM_FIELDS, data, (_field, problem) =>
      problem === 'missing' ? requiredMessage : invalidEmailMessage,
    )

  const { errors, onSubmit, onChange } = useFieldValidation<EnquiryFormFieldName>(FIELD_NAMES, validate)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    onSubmit(event)
    // A valid enquiry is not sent anywhere yet: submission waits for the client's choice of service.
  }

  return (
    <form
      noValidate
      aria-labelledby={labelledBy}
      onSubmit={handleSubmit}
      onInput={onChange}
      onChange={onChange}
      className="flex flex-col gap-8"
    >
      <div className="grid gap-x-8 gap-y-6 header:grid-cols-2">
        {ENQUIRY_FORM_FIELDS.map((field) => (
          <FormFieldControl
            key={field.name}
            field={field}
            label={labels[field.name]}
            error={errors[field.name]}
            motion={MOTION}
            className={cx((field.name === 'jobTitle' || field.name === 'message') && 'header:col-span-2')}
          />
        ))}
      </div>

      <div className="flex">
        <Button type="submit" motion={MOTION} className="w-full md:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
