import 'server-only'

import type { NextRequest } from 'next/server'

import { fallbackBrand, resolveBrandFromHost, type BrandKey } from '@/brands'

/**
 * Guards shared by the site's form routes (`POST /api/subscribe`, `POST /api/enquiry`). /api is outside the proxy
 * matcher, so each route resolves the brand itself, checks the Origin and reads a capped JSON body.
 */

/** Largest body a form route accepts. The forms send well under 8 KB. */
export const MAX_FORM_BODY_BYTES = 16_384

/**
 * The brand a form post belongs to: from the Host, or on a host that maps to no brand (a preview) from the `brand`
 * cookie, then DEFAULT_BRAND. `hostBrand` is the Host's own brand, null on a preview, for `isSameOrigin`.
 */
export function resolveRequestBrand(request: NextRequest): {
  host: string
  hostBrand: BrandKey | null
  brand: BrandKey | null
} {
  const host = request.headers.get('host') ?? ''
  const hostBrand = resolveBrandFromHost(host)

  return { host, hostBrand, brand: hostBrand ?? fallbackBrand(request.cookies.get('brand')?.value) }
}

/**
 * The Origin of a same-site form post. On a brand host any host of the same brand passes (apex, www, staging,
 * localhost); on a host that maps to no brand (a preview) only that very host. Browsers send Origin on every POST.
 */
export function isSameOrigin(origin: string | null, host: string, hostBrand: BrandKey | null) {
  if (!origin) {
    return false
  }

  let originHost: string

  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  return hostBrand ? resolveBrandFromHost(originHost) === hostBrand : originHost.toLowerCase() === host.toLowerCase()
}

/** The JSON object body, or null when it is not JSON, not an object, or larger than `maxBytes`. */
export async function readJsonBody(
  request: NextRequest,
  maxBytes = MAX_FORM_BODY_BYTES,
): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return null
  }

  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) {
    return null
  }

  const text = await readCapped(request.body, maxBytes).catch(() => null)

  if (!text) {
    return null
  }

  try {
    const value: unknown = JSON.parse(text)

    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * The stream as UTF-8 text, or null once it passes `max` bytes: reading stops there, so a body without a
 * content-length, or with a false one, is never read in full.
 */
export async function readCapped(stream: ReadableStream<Uint8Array> | null, max: number): Promise<string | null> {
  if (!stream) {
    return null
  }

  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  for (;;) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    size += value.byteLength

    if (size > max) {
      await reader.cancel().catch(() => undefined)
      return null
    }

    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder().decode(bytes)
}

/** True for a non-blank string, e.g. a filled honeypot. */
export const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== ''
