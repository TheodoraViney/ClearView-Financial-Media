'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { ActionButton } from '@/components/ui/ActionButton.client'
import { cx } from '@/components/ui/cx'
import {
  ConsentField,
  FormFieldControl,
  HoneypotField,
  SendError,
  SubmitButton,
  useFieldValidation,
  validateFields,
  type FieldErrors,
  type FormConsent,
} from '@/components/ui/FormFieldControl.client'
import { track } from '@/lib/analytics'
import { CONTACT_FORM_FIELDS, sendEnquiry, type ContactFormFieldName } from '@/lib/enquiry-form'

export type ContactFormFieldsProps = {
  labels: Record<ContactFormFieldName, string>
  optionalMarker: string
  consent: FormConsent
  submitLabel: string
  errors: {
    firstName: string
    lastName: string
    jobTitle: string
    company: string
    emailMissing: string
    emailInvalid: string
    message: string
    consent: string
  }
  sendError: string
  successMessage: string
  returnLabel: string
}

type ControlName = ContactFormFieldName | 'consent'

// Hover and focus rings, buttons and links as the design: 180ms ease-out.
const MOTION = 'out'

// The order focus follows to the first invalid control: the fields as shown, then the consent box.
const ORDER: readonly ControlName[] = [...CONTACT_FORM_FIELDS.map((item) => item.name), 'consent']

// The field pairs, as the design's: one column with 24 between on mobile, two columns 16 apart from 768.
const PAIR = 'grid min-w-0 gap-6 md:grid-cols-2 md:gap-4'

const CONSENT_ERROR_ID = 'contact-consent-error'

/**
 * The Contact form (design wb-g-contact v1.2, fields in the Jotform form's order): name pair, job title and company
 * pair, email and phone pair (phone optional, marked beside the label), a message that grows with its text, the
 * consent box under a rule, and Send (full width on mobile). Validates on submit through the shared engine: every
 * error at once, focus on the first invalid control, errors re-checked as the visitor fixes them. A valid form is
 * posted to `/api/enquiry` (Send is aria-disabled meanwhile); on success the form is replaced by the success panel (a
 * status message, focused) whose button brings back an empty form with focus on First name. On failure the CMS error
 * shows above Send and what was typed stays. See the comment on the return value for how the panel takes the form's
 * place per breakpoint.
 */
export function ContactFormFields({
  labels,
  optionalMarker,
  consent,
  submitLabel,
  errors: messages,
  sendError,
  successMessage,
  returnLabel,
  labelledBy,
}: ContactFormFieldsProps & { labelledBy?: string }) {
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  // Blocks a second submit before the pending state has rendered.
  const sending = useRef(false)
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
        case 'jobTitle':
          return messages.jobTitle
        case 'company':
          return messages.company
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

    if (!onSubmit(event) || sending.current) {
      return
    }

    sending.current = true
    setPending(true)
    setFailed(false)
    const ok = await sendEnquiry('contact', data)
    sending.current = false
    setPending(false)

    if (ok) {
      track('contact_enquiry')
      focusAfterSwap.current = 'message'
      setSent(true)
    } else {
      setFailed(true)
    }
  }

  const returnToForm = () => {
    formRef.current?.reset()
    reset()
    setFailed(false)
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
        <div className={PAIR}>
          {control('jobTitle')}
          {control('company')}
        </div>
        <div className={PAIR}>
          {control('email')}
          {control('phone')}
        </div>
        {control('message')}

        <ConsentField consent={consent} error={errors.consent} errorId={CONSENT_ERROR_ID} motion={MOTION} />

        <HoneypotField />

        {failed && <SendError>{sendError}</SendError>}

        <div className="flex">
          <SubmitButton pending={pending} motion={MOTION}>
            {submitLabel}
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
