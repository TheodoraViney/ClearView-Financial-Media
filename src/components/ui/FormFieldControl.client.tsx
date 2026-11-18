'use client'

import { useState, type FormEvent, type ReactNode } from 'react'

import type { FormFieldSpec } from '@/lib/enquiry-form'

import { FormField, type FormFieldMarkerPlacement } from './FormField'
import { Input } from './Input'
import type { Motion } from './motion'
import { Textarea } from './Textarea'

/**
 * The engine of the site's own forms (Enquiry form, Contact form): one field control and one browser validation for
 * any field set in `src/lib/enquiry-form.ts`. Each form keeps its own layout, copy and submit.
 */

// Something@something.xx (2+ characters after the last dot), no spaces: the same check as the subscribe pop-up.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type FieldProblem = 'missing' | 'invalid'

export type FieldErrors<N extends string> = Partial<Record<N, string>>

const text = (data: FormData, name: string) => {
  const value = data.get(name)

  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Checks every field of a set: a required field left empty is `missing`, an email that is not an address is
 * `invalid`. `messageFor` gives the text the form shows for each problem.
 */
export function validateFields<F extends FormFieldSpec>(
  fields: readonly F[],
  data: FormData,
  messageFor: (field: F, problem: FieldProblem) => string,
): FieldErrors<F['name']> {
  const result: FieldErrors<F['name']> = {}

  for (const field of fields) {
    const value = text(data, field.name)

    if (field.required && !value) {
      result[field.name as F['name']] = messageFor(field, 'missing')
    } else if (field.type === 'email' && value && !EMAIL_PATTERN.test(value)) {
      result[field.name as F['name']] = messageFor(field, 'invalid')
    }
  }

  return result
}

/**
 * Validation as the subscribe pop-up: on submit every error shows at once and focus moves to the first invalid
 * control, in `order` (control names, e.g. the field set's plus a consent box); a control that shows an error is
 * checked again as the visitor types or ticks, so its message switches (empty → invalid email) or clears once it is
 * valid. Controls without an error stay quiet until the next submit. `onSubmit` returns whether the form is valid.
 * The focus lookup is scoped to the submitted form, so another form on the page with the same names is never touched.
 */
export function useFieldValidation<N extends string>(order: readonly N[], validate: (data: FormData) => FieldErrors<N>) {
  const [errors, setErrors] = useState<FieldErrors<N>>({})

  const onSubmit = (event: FormEvent<HTMLFormElement>): boolean => {
    event.preventDefault()

    const form = event.currentTarget
    const invalid = validate(new FormData(form))

    setErrors(invalid)

    const first = order.find((name) => invalid[name])

    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return false
    }

    return true
  }

  const onChange = (event: FormEvent<HTMLFormElement>) => {
    const name = (event.target as HTMLInputElement).name as N

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

  /** Forgets every error, e.g. when the form is shown again empty. */
  const reset = () => setErrors({})

  return { errors, onSubmit, onChange, reset }
}

/**
 * One field of a set: `FormField` with an `Input` (44 high, hover ring) or, for `textarea`, a `Textarea`.
 * `markerPlacement` and `autoGrow` are opt-in (Contact form); the defaults are the Enquiry form's look.
 */
export function FormFieldControl({
  field,
  label,
  marker,
  markerPlacement,
  error,
  motion,
  autoGrow = false,
  className,
}: {
  field: FormFieldSpec
  label: ReactNode
  marker?: ReactNode
  markerPlacement?: FormFieldMarkerPlacement
  error?: string
  motion: Motion
  autoGrow?: boolean
  className?: string
}) {
  return (
    <FormField
      label={label}
      marker={marker}
      markerPlacement={markerPlacement}
      required={field.required}
      error={error}
      className={className}
    >
      {(control) =>
        field.type === 'textarea' ? (
          <Textarea
            {...control}
            motion={motion}
            hover
            autoGrow={autoGrow}
            name={field.name}
            autoComplete={field.autoComplete}
          />
        ) : (
          <Input
            {...control}
            size="sm"
            motion={motion}
            hover
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
          />
        )
      }
    </FormField>
  )
}
