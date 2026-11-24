/*
 * Conversion events for Google Tag Manager, pushed to `window.dataLayer`. GTM turns them into GA4 key events; the
 * brand layout pushes the page context (the publication) ahead of GTM, so no event carries it. A push is not tracking:
 * consent is applied by Consent Mode inside GTM, so nothing here checks it. Safe without GTM: the array is created
 * when missing and a push never throws. `track` runs in the browser; `trackAttributes` renders anywhere.
 *
 * Generic outbound links and file downloads are not here: GA4 enhanced measurement sends `click` and `file_download`.
 */

/** Which opener the subscribe pop-up came from. */
export type SignupLocation = 'header' | 'banner' | 'stay_informed'

/** Every event and its parameters. The names are final: GTM triggers match them. */
export type AnalyticsEvents = {
  // The subscribe pop-up answered success.
  newsletter_signup: { signup_location?: SignupLocation }
  // The double opt-in link in the confirmation email, see AnalyticsEvents.client.
  newsletter_confirm: Record<string, never>
  sponsorship_enquiry: Record<string, never>
  contact_enquiry: Record<string, never>
  // The awards programme "register / enter" button.
  award_entry_click: { link_url: string; programme: string }
  // The research report "Download report" button.
  report_download: { link_url: string; report: string }
  // An article page mounted: a post from the CMS, or a legacy article from the archive.
  article_view: { content_source: 'cms' | 'archive'; article_id: string }
}

export type AnalyticsEvent = keyof AnalyticsEvents

/** Added by the signup confirmation route to its redirect home (handleSubscribeConfirmed); sends `newsletter_confirm`. */
export const SUBSCRIBED_PARAM = 'subscribed'

type DataLayerWindow = Window & { dataLayer?: unknown[] }

type Params<E extends AnalyticsEvent> = AnalyticsEvents[E] extends Record<string, never>
  ? []
  : Partial<AnalyticsEvents[E]> extends AnalyticsEvents[E]
    ? [params?: AnalyticsEvents[E]]
    : [params: AnalyticsEvents[E]]

function push(payload: Record<string, unknown>) {
  try {
    const w = window as DataLayerWindow

    ;(w.dataLayer ??= []).push(payload)
  } catch {
    // Analytics never breaks the page.
  }
}

/** Pushes `{ event, ...params }` to the dataLayer. Never throws. */
export function track<E extends AnalyticsEvent>(event: E, ...[params]: Params<E>) {
  push({ event, ...params })
}

/** Events sent by a click on a link, through the delegated listener in AnalyticsEvents.client. */
export type ClickEvent = 'award_entry_click' | 'report_download'

/** `data-track` and `data-track-*` attributes, for components that spread them on their link. */
export type TrackAttributes = Record<`data-track${string}`, string>

/**
 * The attributes that make a link send `event` when clicked. `link_url` is read from the link's href at the click, so
 * it is left out here; each other parameter becomes `data-track-{name}` with `_` as `-`.
 */
export function trackAttributes<E extends ClickEvent>(event: E, params: Omit<AnalyticsEvents[E], 'link_url'>): TrackAttributes {
  return Object.fromEntries([
    ['data-track', event],
    ...Object.entries(params).map(([name, value]) => [`data-track-${name.replaceAll('_', '-')}`, String(value)]),
  ])
}

const CLICK_EVENTS: readonly string[] = ['award_entry_click', 'report_download'] satisfies ClickEvent[]

/**
 * Sends the event a clicked link names in `data-track`, with its `data-track-*` attributes as parameters
 * (`data-track-foo-bar` is `foo_bar`) and its href as `link_url`. Links without a known event send nothing.
 */
export function trackLinkClick(link: HTMLAnchorElement) {
  const { track: event, ...data } = link.dataset

  if (event === undefined || !CLICK_EVENTS.includes(event)) {
    return
  }

  const params = Object.entries(data).flatMap(([key, value]) =>
    key.startsWith('track') && value !== undefined
      ? [[key.slice('track'.length).replace(/[A-Z]/g, (c, at: number) => `${at ? '_' : ''}${c.toLowerCase()}`), value]]
      : [],
  )

  push({ event, ...Object.fromEntries(params), link_url: link.href })
}
