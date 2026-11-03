'use client'

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { buttonClasses } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckboxGroup } from '@/components/ui/CheckboxGroup'
import { cx } from '@/components/ui/cx'
import { Dialog } from '@/components/ui/Dialog.client'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HONEYPOT_FIELD } from '@/lib/honeypot'
import {
  isEmailAddress,
  SUBSCRIBE_ENDPOINT,
  SUBSCRIBE_MAX_LENGTH,
  type SubscribeField,
  type SubscribeRequest,
  type SubscribeResponse,
} from '@/lib/subscribe'

import type { SubscribeInterestOption, SubscribeModalData, SubscribePrefill } from './types'

// Screen-reader-only text stays in code.
const CLOSE_DIALOG_LABEL = 'Close dialog'

// Hover as the design: 180ms ease-out.
const MOTION = 'out'

// Form order, which decides the field that takes focus when several are invalid.
const FIELD_ORDER: SubscribeField[] = ['firstName', 'lastName', 'email', 'interests', 'consent']

type Errors = Partial<Record<SubscribeField, string>>

type Status = { kind: 'idle' } | { kind: 'pending' } | { kind: 'failed' } | { kind: 'done' }

const text = (data: FormData, name: string) => {
  const value = data.get(name)

  return typeof value === 'string' ? value.trim() : ''
}

/** Two fields side by side from the header breakpoint (1200), stacked below, as the design. */
function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-6 header:grid-cols-2 header:gap-x-4">{children}</div>
}

/**
 * The subscribe pop-up: one for every brand, coloured by the brand tokens, the interests from the brand's pop-up
 * document. On a publication the first is always ticked; on ClearView there is no heading above them, any can start
 * ticked and at least one must be ticked. Opened from "Stay informed", its email and ticks are carried over. Validates in the browser as the design (every error at once, focus on the
 * first invalid field, each error clears once fixed), then posts JSON to the subscribe route. A failure keeps every
 * value and shows one generic message; success swaps the form for the thank-you screen and focuses it.
 */
export function SubscribeModal({
  data,
  open,
  prefill,
  returnFocus,
  onClose,
}: {
  data: SubscribeModalData
  open: boolean
  prefill?: SubscribePrefill
  returnFocus?: HTMLElement | null
  onClose: () => void
}) {
  const { text: copy, interests, chooseAny, countries, industries } = data
  // The opener's ticks replace the defaults. A locked box is ticked by `locked` itself.
  const ticked = (item: SubscribeInterestOption) => (prefill?.interests ? prefill.interests.includes(item.key) : item.checked)
  const titleId = useId()
  const descriptionId = useId()
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const successHeading = useRef<HTMLHeadingElement>(null)
  const pending = status.kind === 'pending'

  useEffect(() => {
    if (status.kind === 'done') {
      successHeading.current?.focus()
    }
  }, [status.kind])

  const validate = (form: FormData): Errors => {
    const email = text(form, 'email')
    const result: Errors = {}

    if (!text(form, 'firstName')) result.firstName = copy.firstNameError
    if (!text(form, 'lastName')) result.lastName = copy.lastNameError
    if (!isEmailAddress(email)) result.email = email ? copy.emailInvalidError : copy.emailMissingError
    if (chooseAny && form.getAll('interests').length === 0) result.interests = copy.noPublicationError
    if (form.get('consent') !== 'on') result.consent = copy.consentError

    return result
  }

  const focusField = (form: HTMLFormElement, field: SubscribeField) => {
    form.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (pending) {
      return
    }

    const form = event.currentTarget
    const values = new FormData(form)
    const invalid = validate(values)

    setErrors(invalid)

    const first = FIELD_ORDER.find((field) => invalid[field])

    if (first) {
      setStatus({ kind: 'idle' })
      focusField(form, first)
      return
    }

    const optional = (name: string) => text(values, name) || undefined
    const request: SubscribeRequest = {
      firstName: text(values, 'firstName'),
      lastName: text(values, 'lastName'),
      email: text(values, 'email'),
      company: optional('company'),
      jobTitle: optional('jobTitle'),
      country: optional('country'),
      industry: optional('industry'),
      // A locked box is disabled and so missing from the form data; it is always ticked.
      interests: interests.filter((item) => item.locked || values.getAll('interests').includes(item.key)).map((item) => item.key),
      consent: true,
      [HONEYPOT_FIELD]: optional(HONEYPOT_FIELD),
    }

    setStatus({ kind: 'pending' })

    let answer: SubscribeResponse | null = null

    try {
      const response = await fetch(SUBSCRIBE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      })

      answer = (await response.json().catch(() => null)) as SubscribeResponse | null
    } catch {
      answer = null
    }

    if (answer?.status === 'success') {
      setStatus({ kind: 'done' })
      return
    }

    if (answer?.status === 'error' && answer.reason === 'invalid-email') {
      setStatus({ kind: 'idle' })
      setErrors({ email: copy.emailInvalidError })
      focusField(form, 'email')
      return
    }

    if (answer?.status === 'error' && answer.reason === 'invalid' && answer.fields.length > 0) {
      // The server repeats the browser's checks, so this only happens when they disagree: show the same texts.
      const server = validate(values)
      const shown: Errors = Object.fromEntries(
        answer.fields.map((field) => [field, server[field] ?? (field === 'email' ? copy.emailInvalidError : copy.genericError)]),
      )
      const firstShown = FIELD_ORDER.find((field) => shown[field])

      setErrors(shown)
      setStatus({ kind: 'idle' })

      if (firstShown) {
        focusField(form, firstShown)
      }

      return
    }

    setStatus({ kind: 'failed' })
  }

  // Each error clears once its field is valid again; the other errors stay.
  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    const name = (event.target as HTMLInputElement).name as SubscribeField
    const field = FIELD_ORDER.includes(name) ? name : null

    if (!field || !errors[field] || validate(new FormData(event.currentTarget))[field]) {
      return
    }

    setErrors((current) => {
      const next = { ...current }

      delete next[field]
      return next
    })
  }

  const done = status.kind === 'done'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      closeLabel={CLOSE_DIALOG_LABEL}
      returnFocus={returnFocus}
    >
      {done ? (
        <>
          <div className="flex flex-col gap-3 pr-10">
            <h2 id={titleId} ref={successHeading} tabIndex={-1} className="text-title-xl font-medium text-foreground outline-none">
              {copy.successTitle}
            </h2>
            <p id={descriptionId} className="text-base leading-copy text-pretty text-grey">
              {copy.successText}
            </p>
          </div>
          <div className="flex">
            <button
              type="button"
              onClick={onClose}
              className={buttonClasses({ variant: 'outline', motion: MOTION })}
            >
              {copy.closeLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 pr-10">
            {/* Focus lands on the title, not on First name: screen readers read it and Tab goes to the first control. */}
            <h2 id={titleId} tabIndex={-1} data-autofocus className="text-title-xl font-medium text-foreground outline-none">
              {copy.title}
            </h2>
            <p id={descriptionId} className="text-base leading-copy text-pretty text-grey">
              {copy.description}
            </p>
          </div>

          <form
            noValidate
            aria-busy={pending}
            onSubmit={handleSubmit}
            onInput={handleChange}
            onChange={handleChange}
            className="flex flex-col gap-6"
          >
            <FieldRow>
              <FormField label={copy.firstNameLabel} required error={errors.firstName}>
                {(control) => (
                  <Input {...control} size="sm" motion={MOTION} name="firstName" type="text" maxLength={SUBSCRIBE_MAX_LENGTH.firstName} autoComplete="given-name" />
                )}
              </FormField>
              <FormField label={copy.lastNameLabel} required error={errors.lastName}>
                {(control) => <Input {...control} size="sm" motion={MOTION} name="lastName" type="text" maxLength={SUBSCRIBE_MAX_LENGTH.lastName} autoComplete="family-name" />}
              </FormField>
            </FieldRow>

            <FormField label={copy.emailLabel} required error={errors.email}>
              {(control) => (
                <Input
                  {...control}
                  size="sm"
                  motion={MOTION}
                  name="email"
                  type="email"
                  maxLength={SUBSCRIBE_MAX_LENGTH.email}
                  inputMode="email"
                  autoComplete="email"
                  placeholder={copy.emailPlaceholder}
                  defaultValue={prefill?.email}
                />
              )}
            </FormField>

            <FieldRow>
              <FormField label={copy.companyLabel} marker={copy.optionalMarker}>
                {(control) => <Input {...control} size="sm" motion={MOTION} name="company" type="text" maxLength={SUBSCRIBE_MAX_LENGTH.company} autoComplete="organization" />}
              </FormField>
              <FormField label={copy.jobTitleLabel} marker={copy.optionalMarker}>
                {(control) => (
                  <Input {...control} size="sm" motion={MOTION} name="jobTitle" type="text" maxLength={SUBSCRIBE_MAX_LENGTH.jobTitle} autoComplete="organization-title" />
                )}
              </FormField>
            </FieldRow>

            {(countries.length > 0 || industries.length > 0) && (
              <FieldRow>
                {countries.length > 0 && (
                  <FormField label={copy.countryLabel} marker={copy.optionalMarker}>
                    {(control) => (
                      <Select
                        {...control}
                        motion={MOTION}
                        name="country"
                        autoComplete="country-name"
                        defaultValue=""
                        placeholder={copy.countryPlaceholder}
                        options={countries}
                      />
                    )}
                  </FormField>
                )}
                {industries.length > 0 && (
                  <FormField label={copy.industryLabel} marker={copy.optionalMarker}>
                    {(control) => (
                      <Select
                        {...control}
                        motion={MOTION}
                        name="industry"
                        autoComplete="off"
                        defaultValue=""
                        placeholder={copy.industryPlaceholder}
                        options={industries}
                      />
                    )}
                  </FormField>
                )}
              </FieldRow>
            )}

            {interests.length > 0 && (
              <CheckboxGroup
                legend={chooseAny ? undefined : copy.interestsLegend}
                labelledBy={chooseAny ? titleId : undefined}
                error={errors.interests}
              >
                {interests.map((item) => (
                  <Checkbox
                    key={item.key}
                    size="sm"
                    motion={MOTION}
                    name="interests"
                    value={item.key}
                    label={item.label}
                    locked={item.locked}
                    marker={item.locked ? copy.requiredMarker : undefined}
                    defaultChecked={item.locked ? undefined : ticked(item)}
                    aria-invalid={chooseAny ? Boolean(errors.interests) : undefined}
                  />
                ))}
              </CheckboxGroup>
            )}

            <ConsentField data={data} error={errors.consent} />

            {/* Bots fill every input; people never see this one. */}
            <div aria-hidden="true" className="sr-only">
              <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
            </div>

            {status.kind === 'failed' && (
              <p role="alert" className="text-caption text-error">
                {copy.genericError}
              </p>
            )}

            <div className="mt-4 flex flex-col md:flex-row md:items-center">
              {/* aria-disabled rather than disabled while sending, so the focused button keeps focus. */}
              <button
                type="submit"
                aria-disabled={pending}
                className={buttonClasses({
                  motion: MOTION,
                  className: cx('px-4.5 font-medium whitespace-nowrap max-md:w-full', pending && 'cursor-progress opacity-70'),
                })}
              >
                {copy.submitLabel}
              </button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  )
}

/**
 * The required consent box with the Privacy Policy link in its text, above a rule. The link opens in a new tab, so
 * the form keeps what was typed.
 */
function ConsentField({ data, error }: { data: SubscribeModalData; error?: string }) {
  const errorId = useId()
  const { before, after, href } = data.consent

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-6">
      <Checkbox
        size="sm"
        motion={MOTION}
        name="consent"
        aria-required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        label={
          <>
            {before}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener"
                className="text-accent underline underline-offset-2 transition-opacity duration-180 ease-out hover:opacity-60"
              >
                {data.text.privacyLinkLabel}
              </a>
            ) : (
              data.text.privacyLinkLabel
            )}
            {after}
          </>
        }
      />
      {error && (
        <p id={errorId} role="alert" className="pl-7 text-caption text-error">
          {error}
        </p>
      )}
    </div>
  )
}
