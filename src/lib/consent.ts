import { useSyncExternalStore } from 'react'

/*
 * The visitor's cookie choice, from the CookieYes banner that CookieConsent loads in the brand layout. For client
 * components only. CookieYes shows only on the brands' registered domains and their subdomains, so on localhost and
 * the vercel.app hosts nothing that needs consent loads, unless NEXT_PUBLIC_SKIP_CONSENT is set.
 */

/** CookieYes categories. "necessary" needs no consent. */
export type ConsentCategory = 'functional' | 'analytics' | 'performance' | 'advertisement'

type CookieYesWindow = Window & {
  getCkyConsent?: () => { categories?: Partial<Record<ConsentCategory, boolean>> }
  revisitCkyConsent?: () => void
}

// Treats every category as granted, for testing where the banner does not show. Never set on the live domains.
const SKIP_CONSENT = process.env.NEXT_PUBLIC_SKIP_CONSENT === 'true'

// Draft mode (the brand layout's data-preview wrapper) loads no banner; editors see embeds as readers who allowed them.
// Ads are not rendered in draft mode at all.
const isPreview = () => document.querySelector('[data-preview]') !== null

/** Whether the visitor has allowed the category. */
export function hasConsent(category: ConsentCategory): boolean {
  return SKIP_CONSENT || isPreview() || (window as CookieYesWindow).getCkyConsent?.().categories?.[category] === true
}

// CookieYes fires these on the document when its banner loads with a stored choice and when the visitor changes it.
function subscribeConsent(listener: () => void) {
  document.addEventListener('cookieyes_banner_load', listener)
  document.addEventListener('cookieyes_consent_update', listener)

  return () => {
    document.removeEventListener('cookieyes_banner_load', listener)
    document.removeEventListener('cookieyes_consent_update', listener)
  }
}

/** Whether the visitor has allowed the category, re-rendering when they change their choice. False on the server. */
export function useConsent(category: ConsentCategory): boolean {
  return useSyncExternalStore(subscribeConsent, () => hasConsent(category), () => false)
}

/** Opens the CookieYes preferences, so the visitor can change or withdraw consent. */
export function openCookieSettings() {
  ;(window as CookieYesWindow).revisitCkyConsent?.()
}
