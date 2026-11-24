'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

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
import { ENQUIRY_FORM_FIELDS, sendEnquiry, type EnquiryFormField, type EnquiryFormFieldName } from '@/lib/enquiry-form'

export type EnquiryFormFieldsProps = {
  labels: Record<EnquiryFormFieldName, string>
  consent: FormConsent
  submitLabel: string
  requiredMessage: string
  invalidEmailMessage: string
  consentError: string
  sendError: string
  successMessage: string
  returnLabel: string
}

type ControlName = EnquiryFormFieldName | 'consent'

// Hover and focus rings as the design: 180ms ease-out.
const MOTION = 'out'

// The order focus follows to the first invalid control: the fields as shown, then the consent box.
const ORDER: readonly ControlName[] = [...ENQUIRY_FORM_FIELDS.map((field) => field.name), 'consent']

/**
 * The enquiry form: two columns from 1200 (job title and message span both), one below; 24 × 32 gaps, then the
 * consent box under a rule as on the Contact form, 32 above the submit, which is full width on mobile. Validates in
 * the browser as the subscribe pop-up (`useFieldValidation`): every error at once, focus on the first invalid control,
 * each error clears once its control is valid again. Messages come from the CMS: one for an empty required field, one
 * for an invalid email, one for the consent box. A valid form is posted to `/api/enquiry` (the submit is
 * aria-disabled meanwhile); on success the form gives way to the success panel (a status message, focused) whose
 * button brings back an empty form with focus on First name. On failure the CMS error shows above the submit and
 * what was typed stays.
 */
export function EnquiryFormFields({
  labels,
  consent,
  submitLabel,
  requiredMessage,
  invalidEmailMessage,
  consentError,
  sendError,
  successMessage,
  returnLabel,
  labelledBy,
}: EnquiryFormFieldsProps & { labelledBy?: string }) {
  const consentErrorId = useId()
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
    ...validateFields<EnquiryFormField>(ENQUIRY_FORM_FIELDS, data, (_field, problem) =>
      problem === 'missing' ? requiredMessage : invalidEmailMessage,
    ),
    ...(data.get('consent') ? {} : { consent: consentError }),
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
    const ok = await sendEnquiry('sponsorship', data)
    sending.current = false
    setPending(false)

    if (ok) {
      track('sponsorship_enquiry')
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

  // The form stays mounted while the panel shows, hidden and inert; "Return to the form" clears it with a native reset.
  return (
    <div>
      <div role="status" aria-live="polite">
        {sent && (
          <div className="flex flex-col items-start gap-6 rounded-sm bg-white p-6 inset-ring inset-ring-border">
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
        className={cx('flex flex-col gap-8', sent && 'hidden')}
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

        <ConsentField consent={consent} error={errors.consent} errorId={consentErrorId} motion={MOTION} />

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
