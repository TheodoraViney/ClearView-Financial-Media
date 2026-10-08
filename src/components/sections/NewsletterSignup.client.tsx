'use client'

import { useId, useState, type ChangeEvent, type FormEvent } from 'react'

import { Checkbox } from '@/components/ui/Checkbox'
import { EmailField } from '@/components/ui/EmailField'
import { Heading } from '@/components/ui/Heading'

import type { NewsletterSignupProps } from './NewsletterSignup'

// Something@something.something, no spaces. The real check belongs to the mail service once sending exists.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmail = (value: FormDataEntryValue | null) => typeof value === 'string' && EMAIL_PATTERN.test(value.trim())

/**
 * The text column of "Stay informed" as one real form. UI only: submit never reloads and never sends.
 * It validates the email and that one option is ticked, shows both errors at once, moves focus to the
 * first invalid control, and clears each error as soon as that field is fixed. A valid submit does nothing.
 * Below lg one 24px stack; from lg two groups as in the desktop file (options, then text and field),
 * pushed apart in the xl two-column layout so the field sits at the image bottom.
 */
export function NewsletterForm({
  heading,
  body,
  preferencesLabel,
  options,
  emailPlaceholder,
  buttonLabel,
  invalidEmailMessage,
  noOptionMessage,
}: Omit<NewsletterSignupProps, 'image'>) {
  const [emailError, setEmailError] = useState(false)
  const [optionError, setOptionError] = useState(false)
  const optionErrorId = useId()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const data = new FormData(form)
    const optionInvalid = data.getAll('options').length === 0
    const emailInvalid = !isEmail(data.get('email'))

    setOptionError(optionInvalid)
    setEmailError(emailInvalid)

    // Options come first in the form, so they take focus when both are invalid.
    const firstInvalid = optionInvalid ? 'input[name="options"]' : emailInvalid ? 'input[name="email"]' : null

    if (firstInvalid) {
      form.querySelector<HTMLInputElement>(firstInvalid)?.focus()
    }
  }

  // Inputs bubble their change events to the form; an error clears only once its field is valid.
  const handleChange = (event: ChangeEvent<HTMLFormElement>) => {
    const target = event.target as unknown as HTMLInputElement
    const data = new FormData(event.currentTarget)

    if (target.name === 'email' && emailError && isEmail(data.get('email'))) {
      setEmailError(false)
    }

    if (target.name === 'options' && optionError && data.getAll('options').length > 0) {
      setOptionError(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onChange={handleChange}
      // Scroll reveal index 0 (the image beside it is 1), see NewsletterSignup.
      data-reveal
      className="flex flex-col gap-6 scroll-reveal-0 lg:gap-16 xl:justify-between xl:pr-10"
    >
      <div className="flex flex-col gap-6">
        {heading && (
          <Heading as={heading.as} className="text-heading-lg font-medium text-pretty text-foreground">
            {heading.text}
          </Heading>
        )}

        <fieldset aria-invalid={optionError} aria-describedby={optionErrorId} className="relative">
          <legend className="mb-6 text-base font-medium text-foreground">{preferencesLabel}</legend>
          <div className="grid md:grid-cols-2 md:gap-x-6 md:gap-y-4 lg:grid-cols-1 lg:gap-4">
            {options.map((option) => (
              <Checkbox
                key={option.key}
                name="options"
                value={option.key}
                label={option.label}
                defaultChecked={option.defaultChecked}
                motion="responsive"
              />
            ))}
          </div>
          {/* Always rendered so screen readers announce the message when it appears. Absolute, so showing it
              moves nothing: it sits in the gap under the options (24px below lg, where the option rows already
              end in their own padding, and 64px from lg). */}
          <div id={optionErrorId} role="status" aria-live="polite" className="absolute inset-x-0 top-full lg:mt-2">
            {optionError && <p className="text-caption leading-5 text-error">{noOptionMessage}</p>}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-6 lg:gap-4">
        {body && <p className="text-base text-pretty text-grey">{body}</p>}
        <EmailField
          placeholder={emailPlaceholder}
          label="Email address"
          buttonLabel={buttonLabel}
          status={emailError ? 'error' : 'idle'}
          message={invalidEmailMessage}
          motion="responsive"
        />
      </div>
    </form>
  )
}
