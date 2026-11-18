'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { ActionButton } from '@/components/ui/ActionButton.client'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { cx } from '@/components/ui/cx'
import {
  FormFieldControl,
  useFieldValidation,
  validateFields,
  type FieldErrors,
} from '@/components/ui/FormFieldControl.client'
import { CONTACT_FORM_FIELDS, type ContactFormFieldName } from '@/lib/enquiry-form'

export type ContactFormFieldsProps = {
  labels: Record<ContactFormFieldName, string>
  optionalMarker: string
  // The consent text split around the Privacy Policy link; `href` is null when the link has no route.
  consent: { before: string; after: string; linkLabel: string; href: string | null }
  submitLabel: string
  errors: {
    firstName: string
    lastName: string
    emailMissing: string
    emailInvalid: string
    message: string
    consent: string
  }
  successMessage: string
  returnLabel: string
}

/** What a submit reports back: `ok` shows the success panel, `error` keeps the form as it is. */
export type ContactSubmitResult = { ok: true } | { ok: false }

type ControlName = ContactFormFieldName | 'consent'

// Hover and focus rings, buttons and links as the design: 180ms ease-out.
const MOTION = 'out'

// The order focus follows to the first invalid control: the fields as shown, then the consent box.
const ORDER: readonly ControlName[] = [...CONTACT_FORM_FIELDS.map((item) => item.name), 'consent']

// The design's two pairs: one column with 24 between on mobile, two columns 16 apart from 768.
const PAIR = 'grid min-w-0 gap-6 md:grid-cols-2 md:gap-4'

const CONSENT_ERROR_ID = 'contact-consent-error'

/**
 * Nothing is sent yet: the real submission (the client's Jotform) is wired in a separate task, by passing `submit`.
 * Until then every valid form counts as sent.
 */
const sendNothing = async (): Promise<ContactSubmitResult> => ({ ok: true })

/**
 * The Contact form (design wb-g-contact v1.2): name pair, email, phone and company pair (optional, marked beside the
 * label), a message that grows with its text, the consent box under a rule, and Send (full width on mobile, never
 * disabled). Validates on submit through the shared engine: every error at once, focus on the first invalid control,
 * errors re-checked as the visitor fixes them. A valid form goes to `submit`; on `ok` the form is replaced by the
 * success panel (a status message, focused) whose button brings back an empty form with focus on First name.
 * See the comment on the return value for how the panel takes the form's place per breakpoint.
 */
export function ContactFormFields({
  labels,
  optionalMarker,
  consent,
  submitLabel,
  errors: messages,
  successMessage,
  returnLabel,
  labelledBy,
  submit = sendNothing,
}: ContactFormFieldsProps & { labelledBy?: string; submit?: (data: FormData) => Promise<ContactSubmitResult> }) {
  const [sent, setSent] = useState(false)
  const pending = useRef(false)
  // Where focus goes once the swap has rendered: the success message, or First name of the restored form.
  const focusAfterSwap = useRef<'message' | 'form' | null>(null)
  const messageRef = useRef<HTMLParagraphElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const validate = (data: FormData): FieldErrors<ControlName> => ({
    ...validateFields(CONTACT_FORM_FIELDS, data, (item, problem) => {
      switch (item.name) {
        case 'firstName':
          return messages.firstName
        case 'lastName':
          return messages.lastName
        case 'email':
          return problem === 'missing' ? messages.emailMissing : messages.emailInvalid
        default:
          return messages.message
      }
    }),
    ...(data.get('consent') ? {} : { consent: messages.consent }),
  })

  const { errors, onSubmit, onChange, reset } = useFieldValidation<ControlName>(ORDER, validate)

  useEffect(() => {
    if (focusAfterSwap.current === 'message') {
      messageRef.current?.focus({ preventScroll: true })
    } else if (focusAfterSwap.current === 'form') {
      formRef.current?.querySelector<HTMLElement>('[name="firstName"]')?.focus()
    }

    focusAfterSwap.current = null
  }, [sent])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget)

    if (!onSubmit(event) || pending.current) {
      return
    }

    pending.current = true
    const result = await submit(data)
    pending.current = false

    if (result.ok) {
      focusAfterSwap.current = 'message'
      setSent(true)
    }
  }

  const returnToForm = () => {
    formRef.current?.reset()
    reset()
    focusAfterSwap.current = 'form'
    setSent(false)
  }

  const control = (name: ContactFormFieldName) => {
    const item = CONTACT_FORM_FIELDS.find((candidate) => candidate.name === name)

    return item ? (
      <FormFieldControl
        field={item}
        label={labels[name]}
        marker={item.required ? undefined : optionalMarker}
        markerPlacement="inline"
        error={errors[name]}
        motion={MOTION}
        autoGrow={item.type === 'textarea'}
      />
    ) : null
  }

  // On a valid submit the panel replaces the form. From 1200 the form stays in the layout, invisible and inert, so the
  // row keeps its height and the image beside it its size; the panel sits on top of it, at the top of the column.
  // Below 1200 the image comes after the form, so the form is simply taken out (`hidden`) and the panel takes its
  // place. The form stays mounted either way; "Return to the form" clears it with a native reset.
  return (
    <div className="relative">
      <div role="status" aria-live="polite">
        {sent && (
          <div className="flex flex-col items-start gap-6 rounded-sm bg-white p-6 inset-ring inset-ring-border header:absolute header:inset-x-0 header:top-0">
            <p ref={messageRef} tabIndex={-1} className="text-title-lg leading-6.5 font-medium text-pretty outline-none">
              {successMessage}
            </p>
            <ActionButton variant="outline-accent-tint" motion={MOTION} onClick={returnToForm}>
              {returnLabel}
            </ActionButton>
          </div>
        )}
      </div>

      <form
        ref={formRef}
        inert={sent}
        noValidate
        aria-labelledby={labelledBy}
        onSubmit={handleSubmit}
        onInput={onChange}
        onChange={onChange}
        className={cx('flex flex-col gap-6', sent && 'hidden header:flex header:invisible')}
      >
        <fieldset className={PAIR}>
          {/* Screen-reader only, so it stays in code. */}
          <legend className="sr-only">Your name</legend>
          {control('firstName')}
          {control('lastName')}
        </fieldset>
        {control('email')}
        <div className={PAIR}>
          {control('phone')}
          {control('company')}
        </div>
        {control('message')}

        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <Checkbox
            size="sm"
            target="tall"
            motion={MOTION}
            name="consent"
            aria-required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? CONSENT_ERROR_ID : undefined}
            label={
              <>
                {consent.before}
                {consent.href ? (
                  <a
                    href={consent.href}
                    target="_blank"
                    rel="noopener"
                    className="text-accent underline underline-offset-2 transition-colors duration-180 ease-out hover:text-accent-hover"
                  >
                    {consent.linkLabel}
                  </a>
                ) : (
                  consent.linkLabel
                )}
                {consent.after}
              </>
            }
          />
          {errors.consent && (
            <p id={CONSENT_ERROR_ID} role="alert" className="text-caption text-error">
              {errors.consent}
            </p>
          )}
        </div>

        <div className="flex">
          <Button type="submit" motion={MOTION} className="w-full md:w-auto">
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}
