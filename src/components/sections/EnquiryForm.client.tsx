'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ENQUIRY_FORM_FIELDS, type EnquiryFormFieldName } from '@/lib/enquiry-form'

export type EnquiryFormFieldsProps = {
  labels: Record<EnquiryFormFieldName, string>
  submitLabel: string
  requiredMessage: string
  invalidEmailMessage: string
}

type Errors = Partial<Record<EnquiryFormFieldName, string>>

// Hover and focus rings as the design: 180ms ease-out.
const MOTION = 'out'

// Something@something.something, no spaces: the same check as the subscribe pop-up.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const text = (data: FormData, name: string) => {
  const value = data.get(name)

  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The enquiry form: two columns from 1200 (job title and message span both), one below; 24 × 32 gaps, 32 above the
 * submit, which is full width on mobile. Validates in the browser as the subscribe pop-up: every error at once, focus
 * on the first invalid field, each error clears once its field is valid again. Messages come from the CMS.
 */
export function EnquiryFormFields({
  labels,
  submitLabel,
  requiredMessage,
  invalidEmailMessage,
  labelledBy,
}: EnquiryFormFieldsProps & { labelledBy?: string }) {
  const [errors, setErrors] = useState<Errors>({})

  const validate = (form: FormData): Errors => {
    const result: Errors = {}

    for (const field of ENQUIRY_FORM_FIELDS) {
      const value = text(form, field.name)

      if (field.required && !value) {
        result[field.name] = requiredMessage
      } else if (field.type === 'email' && value && !EMAIL_PATTERN.test(value)) {
        result[field.name] = invalidEmailMessage
      }
    }

    return result
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const invalid = validate(new FormData(form))

    setErrors(invalid)

    const first = ENQUIRY_FORM_FIELDS.find((field) => invalid[field.name])

    if (first) {
      form.querySelector<HTMLElement>(`[name="${first.name}"]`)?.focus()
      return
    }

    // A valid enquiry is not sent anywhere yet: submission waits for the client's choice of service.
  }

  // A field that shows an error is checked again as the visitor types: the message switches (empty → invalid email) or
  // clears once the field is valid. Fields without an error stay quiet until the next submit.
  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    const name = (event.target as HTMLInputElement).name as EnquiryFormFieldName

    if (!errors[name]) {
      return
    }

    const message = validate(new FormData(event.currentTarget))[name]

    if (message === errors[name]) {
      return
    }

    setErrors((current) => {
      const next = { ...current }

      if (message) {
        next[name] = message
      } else {
        delete next[name]
      }

      return next
    })
  }

  return (
    <form
      noValidate
      aria-labelledby={labelledBy}
      onSubmit={handleSubmit}
      onInput={handleChange}
      onChange={handleChange}
      className="flex flex-col gap-8"
    >
      <div className="grid gap-x-8 gap-y-6 header:grid-cols-2">
        {ENQUIRY_FORM_FIELDS.map((field) => (
          <FormField
            key={field.name}
            label={labels[field.name]}
            required={field.required}
            error={errors[field.name]}
            className={cx((field.name === 'jobTitle' || field.name === 'message') && 'header:col-span-2')}
          >
            {(control) =>
              field.type === 'textarea' ? (
                <Textarea {...control} motion={MOTION} hover name={field.name} autoComplete={field.autoComplete} />
              ) : (
                <Input
                  {...control}
                  size="sm"
                  motion={MOTION}
                  hover
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                />
              )
            }
          </FormField>
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
