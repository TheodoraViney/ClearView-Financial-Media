import { useCallback, useSyncExternalStore } from 'react'

/**
 * Studio side of the ad unit code check: asks GET /api/gam/ad-unit with the signed-in user's Sanity token and keeps
 * the answers for the page session, shared by the fields' validation (src/sanity/schema/documents/brand.ts) and by
 * AdUnitCodeInput, which shows the unit's name. A failed check is not kept, so the next validation asks again.
 */

export type AdUnit = { name: string; code: string; status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; sizes: string[] }

export type AdUnitLookup = { status: 'found'; unit: AdUnit } | { status: 'missing' } | { status: 'error'; error: string }

// Validation runs again on every keystroke; a code is only sent once typing has paused this long.
const TYPING_PAUSE_MS = 700

const answers = new Map<string, AdUnitLookup>()
const inFlight = new Map<string, Promise<AdUnitLookup>>()
const latestByField = new Map<string, string>()
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((listener) => listener())

async function request(code: string, token: string): Promise<AdUnitLookup> {
  try {
    const response = await fetch(`/api/gam/ad-unit?code=${encodeURIComponent(code)}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    const body = (await response.json().catch(() => null)) as Partial<{
      ok: boolean
      unit: AdUnit | null
      error: string
    }> | null

    if (!response.ok || !body?.ok || body.unit === undefined) {
      return { status: 'error', error: body?.error || 'Could not check the code with Ad Manager.' }
    }

    return body.unit ? { status: 'found', unit: body.unit } : { status: 'missing' }
  } catch {
    return { status: 'error', error: 'Could not reach the server.' }
  }
}

/**
 * The check for `code`, typed into the field at `fieldKey`. Resolves to null when the field has changed while waiting
 * for the typing pause: the validation of the newer value gives the answer instead.
 */
export async function lookupAdUnit(code: string, token: string, fieldKey: string): Promise<AdUnitLookup | null> {
  const known = answers.get(code)

  if (known) {
    return known
  }

  latestByField.set(fieldKey, code)
  await new Promise((resolve) => setTimeout(resolve, TYPING_PAUSE_MS))

  if (latestByField.get(fieldKey) !== code) {
    return null
  }

  let pending = inFlight.get(code)

  if (!pending) {
    pending = request(code, token).then((answer) => {
      inFlight.delete(code)

      if (answer.status !== 'error') {
        answers.set(code, answer)
        notify()
      }

      return answer
    })
    inFlight.set(code, pending)
  }

  return pending
}

/** The kept answer for `code`, re-rendering when it arrives. Undefined while unchecked or after a failed check. */
export function useAdUnitLookup(code: string | undefined): AdUnitLookup | undefined {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => (code ? answers.get(code) : undefined),
    () => undefined,
  )
}
