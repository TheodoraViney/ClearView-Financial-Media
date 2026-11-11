// Plain fetch against the Algolia REST API, no SDK. Server and scripts only: the keys never reach the browser.
// No server imports here, so the indexing scripts can run it under bun.

type Credentials = { appId: string; key: string }

function credentials(write: boolean): Credentials {
  const appId = process.env.ALGOLIA_APP_ID
  const key = write ? process.env.ALGOLIA_WRITE_KEY : process.env.ALGOLIA_SEARCH_KEY

  if (!appId || !key) {
    throw new Error(`ALGOLIA_APP_ID or ${write ? 'ALGOLIA_WRITE_KEY' : 'ALGOLIA_SEARCH_KEY'} is not set`)
  }

  return { appId, key }
}

async function request<T>(write: boolean, method: string, path: string, body?: unknown): Promise<T> {
  const { appId, key } = credentials(write)
  // Reads go to the distributed search network, writes to the main cluster.
  const host = write ? `${appId}.algolia.net` : `${appId}-dsn.algolia.net`
  const response = await fetch(`https://${host}${path}`, {
    method,
    headers: {
      'X-Algolia-Application-Id': appId,
      'X-Algolia-API-Key': key,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')

    throw new Error(`Algolia ${method} ${path.replace(/\?.*$/, '')}: HTTP ${response.status} ${detail.slice(0, 200)}`)
  }

  return (await response.json()) as T
}

const indexPath = (index: string) => `/1/indexes/${encodeURIComponent(index)}`

export type AlgoliaHit<T> = T & { objectID: string }

/** One search on one index, with the search-only key. Each call is one billed search request. */
export function algoliaSearch<T>(index: string, params: Record<string, unknown>) {
  return request<{ hits: AlgoliaHit<T>[]; nbHits: number }>(false, 'POST', `${indexPath(index)}/query`, params)
}

type Task = { taskID: number }

/** Upserts and deletes in one batch, at most about 1,000 operations. */
export function algoliaBatch(index: string, upserts: { objectID: string }[], deletes: string[] = []) {
  return request<Task>(true, 'POST', `${indexPath(index)}/batch`, {
    requests: [
      ...upserts.map((body) => ({ action: 'updateObject', body })),
      ...deletes.map((objectID) => ({ action: 'deleteObject', body: { objectID } })),
    ],
  })
}

export function algoliaSetSettings(index: string, settings: Record<string, unknown>) {
  return request<Task>(true, 'PUT', `${indexPath(index)}/settings`, settings)
}

/** Waits until a write task is applied to the index. */
export async function algoliaWaitTask(index: string, { taskID }: Task) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { status } = await request<{ status: string }>(true, 'GET', `${indexPath(index)}/task/${taskID}`)

    if (status === 'published') {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Algolia task ${taskID} not published after 60 s`)
}
