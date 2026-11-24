/**
 * Google sign-in for the analytics scripts: installed-app OAuth with a loopback redirect and PKCE, run as the person
 * at the keyboard. No service account: the GTM containers and GA4 properties belong to the client and are shared with
 * a person, not with a robot.
 *
 *   GOOGLE_OAUTH_CLIENT_FILE  the "Desktop app" OAuth client JSON downloaded from Google Cloud Console (required)
 *   GOOGLE_TOKEN_FILE         where the refresh token is cached, default `.google-token.json` at the repo root
 *
 * The first run opens the browser for consent; later runs reuse the cached refresh token. The token file is
 * gitignored and written with mode 0600. Delete it to sign in again or to switch accounts.
 *
 * Scopes deliberately leave out `tagmanager.publish`: a script can write a workspace and cut a version, but publishing
 * stays a click in the GTM UI.
 */

import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'

export const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/analytics.readonly',
] as const

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CONSENT_TIMEOUT_MS = 5 * 60_000

interface OAuthClient {
  client_id: string
  client_secret: string
}

interface CachedToken {
  client_id: string
  refresh_token: string
  scope: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}

const tokenFile = () => resolve(process.cwd(), process.env.GOOGLE_TOKEN_FILE || '.google-token.json')

function readClient(): OAuthClient {
  const file = process.env.GOOGLE_OAUTH_CLIENT_FILE

  if (!file) {
    throw new Error('Set GOOGLE_OAUTH_CLIENT_FILE to the Desktop app OAuth client JSON. See scripts/analytics/README.md.')
  }

  const json = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as { installed?: OAuthClient; web?: unknown }

  if (!json.installed?.client_id || !json.installed.client_secret) {
    throw new Error(`${file} is not a "Desktop app" OAuth client (no "installed" key). Create one of type Desktop app.`)
  }

  return json.installed
}

function readCachedToken(client: OAuthClient): CachedToken | undefined {
  const file = tokenFile()

  if (!existsSync(file)) {
    return undefined
  }

  const cached = JSON.parse(readFileSync(file, 'utf8')) as CachedToken
  const granted = new Set(cached.scope?.split(' ') ?? [])

  if (cached.client_id !== client.client_id || !SCOPES.every((scope) => granted.has(scope))) {
    return undefined
  }

  return cached
}

async function postToken(form: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  })

  return (await response.json()) as TokenResponse
}

const base64url = (buffer: Buffer) => buffer.toString('base64url')

function openBrowser(url: string) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'

  try {
    spawn(command, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref()
  } catch {
    // The URL is printed too.
  }
}

/** Runs the consent screen once and caches the refresh token. */
async function signIn(client: OAuthClient): Promise<TokenResponse> {
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const state = base64url(randomBytes(24))

  const server = createServer()

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const redirectUri = `http://127.0.0.1:${port}`

  const url = `${AUTH_URL}?${new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    // The account chooser, so the browser's default Google account is never picked silently.
    prompt: 'consent select_account',
    ...(process.env.GOOGLE_LOGIN_HINT ? { login_hint: process.env.GOOGLE_LOGIN_HINT } : {}),
  })}`

  console.error(`\nSign in to Google in the browser. If it did not open, visit:\n${url}\n`)
  openBrowser(url)

  try {
    const code = await new Promise<string>((done, fail) => {
      const timer = setTimeout(() => fail(new Error('No consent within 5 minutes.')), CONSENT_TIMEOUT_MS)

      server.on('request', (request, response) => {
        const params = new URL(request.url ?? '/', redirectUri).searchParams
        const error = params.get('error')
        const value = params.get('code')

        if (!error && !value) {
          response.writeHead(404).end()

          return
        }

        const ok = !error && params.get('state') === state

        response
          .writeHead(ok ? 200 : 400, { 'content-type': 'text/plain; charset=utf-8' })
          .end(ok ? 'Signed in. You can close this tab.' : 'Sign-in failed. See the terminal.')
        clearTimeout(timer)

        if (ok && value) {
          done(value)
        } else {
          fail(new Error(error ? `Google returned "${error}".` : 'OAuth state mismatch.'))
        }
      })
    })

    const token = await postToken({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: redirectUri,
    })

    if (!token.access_token || !token.refresh_token) {
      throw new Error(`Token exchange failed: ${token.error ?? 'no refresh token'} ${token.error_description ?? ''}`)
    }

    const cached: CachedToken = {
      client_id: client.client_id,
      refresh_token: token.refresh_token,
      scope: token.scope ?? SCOPES.join(' '),
    }

    writeFileSync(tokenFile(), `${JSON.stringify(cached, null, 2)}\n`, { mode: 0o600 })
    // `mode` applies only when the file is created; an existing file keeps its permissions otherwise.
    chmodSync(tokenFile(), 0o600)
    console.error(`Refresh token cached in ${tokenFile()}.`)

    return token
  } finally {
    server.close()
  }
}

let current: { token: string; expiresAt: number } | undefined

/** A valid access token, signing in or refreshing as needed. */
export async function getAccessToken(): Promise<string> {
  if (current && current.expiresAt > Date.now() + 60_000) {
    return current.token
  }

  const client = readClient()
  const cached = readCachedToken(client)
  let token: TokenResponse | undefined

  if (cached) {
    const refreshed = await postToken({
      grant_type: 'refresh_token',
      refresh_token: cached.refresh_token,
      client_id: client.client_id,
      client_secret: client.client_secret,
    })

    if (refreshed.access_token) {
      token = refreshed
    } else {
      // invalid_grant: revoked, or expired (7 days while the consent screen is in Testing). Sign in again.
      console.error(`Cached refresh token rejected (${refreshed.error}). Signing in again.`)
      rmSync(tokenFile(), { force: true })
    }
  }

  token ??= await signIn(client)
  current = { token: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 }

  return current.token
}

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    method: string,
    url: string,
  ) {
    super(`${method} ${url} -> ${status}\n${body}`)
  }
}

interface ClientOptions {
  /** Minimum gap between requests. GTM API's default quota is 0.25 requests per second per project. */
  minIntervalMs?: number
}

/** JSON client for a Google REST API, with throttling and retry on 429 and 5xx. */
export function googleClient(baseUrl: string, { minIntervalMs = 0 }: ClientOptions = {}) {
  let last = 0

  async function request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = `${baseUrl}/${path.replace(/^\//, '')}${query ? `?${new URLSearchParams(query)}` : ''}`

    for (let attempt = 0; ; attempt++) {
      const wait = last + minIntervalMs - Date.now()

      if (wait > 0) {
        await new Promise((done) => setTimeout(done, wait))
      }

      last = Date.now()

      const response = await fetch(url, {
        method,
        headers: {
          authorization: `Bearer ${await getAccessToken()}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })

      if ((response.status === 429 || response.status >= 500) && attempt < 5) {
        const backoff = Math.max(minIntervalMs, 2000) * 2 ** attempt

        console.error(`  ${response.status} on ${method} ${path}, retrying in ${Math.round(backoff / 1000)}s`)
        await new Promise((done) => setTimeout(done, backoff))
        continue
      }

      const text = await response.text()

      if (!response.ok) {
        throw new GoogleApiError(response.status, text, method, url)
      }

      return (text ? JSON.parse(text) : {}) as T
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, string>) => request<T>('GET', path, undefined, query),
    post: <T>(path: string, body: unknown = {}, query?: Record<string, string>) => request<T>('POST', path, body, query),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    patch: <T>(path: string, body: unknown, query?: Record<string, string>) => request<T>('PATCH', path, body, query),
    delete: <T>(path: string) => request<T>('DELETE', path),
    /** Follows `nextPageToken`, concatenating `key` from each page. */
    async list<T>(path: string, key: string, query: Record<string, string> = {}): Promise<T[]> {
      const items: T[] = []
      let pageToken: string | undefined

      do {
        const page = await request<Record<string, unknown>>('GET', path, undefined, {
          ...query,
          ...(pageToken ? { pageToken } : {}),
        })

        items.push(...((page[key] as T[] | undefined) ?? []))
        pageToken = page.nextPageToken as string | undefined
      } while (pageToken)

      return items
    },
  }
}

export type GoogleClient = ReturnType<typeof googleClient>
