import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { isBrandKey, type BrandKey } from '@/brands'

/**
 * The `t` parameter on the confirmation link's redirect (`/api/subscribe/confirmed?t=`). Brevo keeps the query on
 * redirectionUrl, so the click lands with what the signup asked for, and the route can tell a real confirmation from a
 * hand-typed URL before it emails the team.
 *
 * Format: base64url(iv | ciphertext | tag), AES-256-GCM with a random 12-byte iv, the key being SHA-256 of
 * SIGNUP_NOTIFY_SECRET; the plaintext is the JSON of SignupToken. Encrypted, not only signed, because the URL lands
 * in request logs and browser history and the payload holds the reader's address.
 */

export type SignupToken = {
  email: string
  /** Brand the signup was made on. */
  brand: BrandKey
  /** Brevo attribute names this signup set true that the contact did not hold yet. */
  added: string[]
  /** The contact was not a confirmed member of the website list when it signed up. */
  isNew: boolean
  /** Issued at, in seconds. */
  iat: number
}

/** How long a confirmation link counts: it bounds a leaked one. */
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60

// Allowance for a clock ahead of ours.
const CLOCK_SKEW_SECONDS = 60

// Far above a real token (an address and up to 16 attribute names); anything longer is not read.
const MAX_TOKEN_LENGTH = 4_096

const IV_BYTES = 12
const TAG_BYTES = 16

/** The secret, or null when unset: then no token is issued and no confirmation is notified. */
export const signupNotifySecret = () => process.env.SIGNUP_NOTIFY_SECRET || null

const key = (secret: string) => createHash('sha256').update(secret).digest()

export function createSignupToken(
  { email, brand, added, isNew }: Omit<SignupToken, 'iat'>,
  secret: string,
  now = Date.now(),
): string {
  const token: SignupToken = { email, brand, added, isNew, iat: Math.floor(now / 1000) }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(token), 'utf8'), cipher.final()])

  return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64url')
}

/** The token's content, or null when it is malformed, made with another secret, or older than 30 days. */
export function readSignupToken(token: string | null | undefined, secret: string, now = Date.now()): SignupToken | null {
  if (!token || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return null
  }

  const bytes = Buffer.from(token, 'base64url')

  if (bytes.length <= IV_BYTES + TAG_BYTES) {
    return null
  }

  let value: unknown

  try {
    const decipher = createDecipheriv('aes-256-gcm', key(secret), bytes.subarray(0, IV_BYTES))

    decipher.setAuthTag(bytes.subarray(bytes.length - TAG_BYTES))

    const plaintext = Buffer.concat([decipher.update(bytes.subarray(IV_BYTES, bytes.length - TAG_BYTES)), decipher.final()])

    value = JSON.parse(plaintext.toString('utf8'))
  } catch {
    return null
  }

  if (!isSignupToken(value)) {
    return null
  }

  const age = Math.floor(now / 1000) - value.iat

  return age <= MAX_AGE_SECONDS && age >= -CLOCK_SKEW_SECONDS ? value : null
}

function isSignupToken(value: unknown): value is SignupToken {
  if (!value || typeof value !== 'object') {
    return false
  }

  const { email, brand, added, isNew, iat } = value as Record<string, unknown>

  return (
    typeof email === 'string' &&
    email !== '' &&
    typeof brand === 'string' &&
    isBrandKey(brand) &&
    Array.isArray(added) &&
    added.every((name) => typeof name === 'string') &&
    typeof isNew === 'boolean' &&
    typeof iat === 'number' &&
    Number.isInteger(iat)
  )
}
