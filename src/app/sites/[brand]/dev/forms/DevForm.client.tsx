'use client'

import { useActionState } from 'react'

import type { FormResult } from '@/lib/forms'

const MESSAGES: Record<FormResult['status'], string> = {
  idle: '',
  success: 'Sent.',
  error: 'Failed.',
}

/** One plain test form bound to a server action. The result is shown raw, there is no design here. */
export function DevForm({
  title,
  action,
  honeypotField,
  publications,
  defaultPublication,
  firstNameRequired = false,
}: {
  title: string
  action: (previous: FormResult, formData: FormData) => Promise<FormResult>
  honeypotField: string
  /** Publications to test against; the action reads the chosen one's Brevo settings from the CMS. */
  publications: { value: string; label: string }[]
  defaultPublication?: string
  firstNameRequired?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, { status: 'idle' })

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <h2 className="text-title-lg font-medium">{title}</h2>

      <label className="flex flex-col gap-1">
        Publication
        <select name="publication" defaultValue={defaultPublication} className="border p-2">
          {publications.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        First name{firstNameRequired ? '' : ' (optional)'}
        <input name="firstName" required={firstNameRequired} autoComplete="given-name" className="border p-2" />
      </label>

      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" required autoComplete="email" className="border p-2" />
      </label>

      {/* Honeypot: clipped off-screen (bots skip display:none fields), hidden from assistive tech, filled only by bots. */}
      <input name={honeypotField} type="text" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />

      <button type="submit" disabled={pending} className="self-start border px-4 py-2">
        {pending ? 'Sending…' : 'Submit'}
      </button>

      <p role="status" aria-live="polite">
        {MESSAGES[state.status]}
        {state.status === 'error' && ` (${state.reason})`}
      </p>
    </form>
  )
}
