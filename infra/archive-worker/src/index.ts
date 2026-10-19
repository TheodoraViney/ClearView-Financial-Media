/**
 * Read-only front for the `wb-archive` R2 bucket.
 *
 * Two prefixes are reachable: `/records/{id}` serves one archived article as
 * JSON, `/media/{path}` serves an image or PDF it references. Every other key
 * in the bucket, such as `meta/manifest.json`, is never served.
 */

// Objects never change once written. A new export writes new keys.
const HIT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

// Short, so an object uploaded after a miss shows up within a minute.
const MISS_CACHE_CONTROL = 'public, max-age=60'

const ALLOW = 'GET, HEAD'

// Legacy ids are positive integers. The cap keeps the key space bounded.
const RECORD_ID = /^[1-9]\d{0,8}$/

// Checked after percent-decoding, so `%00` and `%0A` are caught too.
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

/**
 * The only types served inline. Anything else, HTML above all, goes out as an
 * `application/octet-stream` download so it can never render on the origin.
 */
const INLINE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

const INLINE_TYPE_VALUES = new Set(Object.values(INLINE_TYPES))

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed\n', {
        status: 405,
        headers: { Allow: ALLOW, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // `pathname` is still percent-encoded. The URL parser has already
    // resolved literal and `%2e` dot segments, so `/media/../x` arrives as `/x`.
    const { pathname } = new URL(request.url)

    if (pathname.startsWith('/records/')) {
      const id = pathname.slice('/records/'.length)

      if (!RECORD_ID.test(id)) {
        return notFound()
      }

      return serve(request, env.ARCHIVE, `records/${id}.json`, () => 'application/json; charset=utf-8', false)
    }

    if (pathname.startsWith('/media/')) {
      const path = decodeMediaPath(pathname.slice('/media/'.length))

      if (path === null) {
        return new Response('Bad Request\n', {
          status: 400,
          headers: { 'Cache-Control': MISS_CACHE_CONTROL, 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }

      return serve(request, env.ARCHIVE, `media/${path}`, mediaType, true)
    }

    return notFound()
  },
} satisfies ExportedHandler<Env>

/**
 * Turns the encoded request path into the decoded, NFC-normalised key suffix
 * the uploader wrote. Returns null for anything that is not a plain relative
 * path: empty or dot segments, an encoded `/` or `\`, control characters, or
 * malformed percent-encoding.
 */
function decodeMediaPath(encoded: string): string | null {
  const segments: string[] = []

  for (const raw of encoded.split('/')) {
    let segment: string

    try {
      segment = decodeURIComponent(raw).normalize('NFC')
    } catch {
      return null
    }

    if (
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.includes('/') ||
      segment.includes('\\') ||
      CONTROL_CHARACTERS.test(segment)
    ) {
      return null
    }

    segments.push(segment)
  }

  return segments.join('/')
}

/** Content type for a media object: the upload metadata, else the extension. */
function mediaType(object: R2Object): string {
  const stored = object.httpMetadata?.contentType?.split(';')[0].trim().toLowerCase()

  if (stored) {
    return stored
  }

  const extension = object.key.match(/\.([^./]+)$/)?.[1].toLowerCase() ?? ''

  return INLINE_TYPES[extension] ?? 'application/octet-stream'
}

async function serve(
  request: Request,
  bucket: R2Bucket,
  key: string,
  contentType: (object: R2Object) => string,
  allowRange: boolean,
): Promise<Response> {
  let object: R2Object | R2ObjectBody | null

  if (request.method === 'HEAD') {
    object = await bucket.head(key)
  } else {
    try {
      // R2 parses If-None-Match, If-Match and Range straight from the headers.
      // A failed precondition returns the metadata without a body.
      object = await bucket.get(key, {
        onlyIf: request.headers,
        range: allowRange ? request.headers : undefined,
      })
    } catch {
      // R2 throws on a Range it cannot satisfy.
      return new Response(null, { status: 416, headers: { 'Cache-Control': MISS_CACHE_CONTROL } })
    }
  }

  if (object === null) {
    return notFound()
  }

  const headers = objectHeaders(object, contentType(object), allowRange)

  if (request.method === 'HEAD') {
    if (noneMatch(request.headers.get('If-None-Match'), object.httpEtag)) {
      return new Response(null, { status: 304, headers })
    }

    headers.set('Content-Length', String(object.size))

    return new Response(null, { headers })
  }

  if (!('body' in object)) {
    const status = request.headers.has('If-Match') || request.headers.has('If-Unmodified-Since') ? 412 : 304

    return new Response(null, { status, headers })
  }

  const range = request.headers.has('Range') ? contentRange(object) : null

  if (range) {
    headers.set('Content-Range', range)

    return new Response(object.body, { status: 206, headers })
  }

  return new Response(object.body, { headers })
}

function objectHeaders(object: R2Object, contentType: string, allowRange: boolean): Headers {
  const headers = new Headers({
    'Cache-Control': HIT_CACHE_CONTROL,
    ETag: object.httpEtag,
    'Last-Modified': object.uploaded.toUTCString(),
    'X-Content-Type-Options': 'nosniff',
  })

  if (!INLINE_TYPE_VALUES.has(contentType) && !contentType.startsWith('application/json')) {
    headers.set('Content-Type', 'application/octet-stream')
    headers.set('Content-Disposition', 'attachment')
  } else {
    headers.set('Content-Type', contentType)
  }

  // An <img> ignores Content-Disposition, but a direct visit downloads the SVG
  // instead of running any script inside it on this origin.
  if (contentType === 'image/svg+xml') {
    headers.set('Content-Disposition', 'attachment')
  }

  if (allowRange) {
    headers.set('Accept-Ranges', 'bytes')
  }

  return headers
}

/** The `Content-Range` value for the slice R2 returned, or null for the whole object. */
function contentRange(object: R2ObjectBody): string | null {
  const range = object.range

  if (!range) {
    return null
  }

  let offset: number
  let length: number

  if ('suffix' in range && range.suffix !== undefined) {
    length = Math.min(range.suffix, object.size)
    offset = object.size - length
  } else {
    offset = 'offset' in range ? (range.offset ?? 0) : 0
    length = 'length' in range ? (range.length ?? object.size - offset) : object.size - offset
  }

  if (offset === 0 && length === object.size) {
    return null
  }

  return `bytes ${offset}-${offset + length - 1}/${object.size}`
}

/** Weak comparison of an If-None-Match list against the object's ETag. */
function noneMatch(header: string | null, etag: string): boolean {
  if (!header) {
    return false
  }

  const strip = (value: string) => value.trim().replace(/^W\//, '')

  return header.split(',').some((value) => value.trim() === '*' || strip(value) === strip(etag))
}

function notFound(): Response {
  return new Response('Not Found\n', {
    status: 404,
    headers: { 'Cache-Control': MISS_CACHE_CONTROL, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
