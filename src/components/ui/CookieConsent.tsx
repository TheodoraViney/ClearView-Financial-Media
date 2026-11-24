import { BRANDS, brandColorVars, type BrandKey } from '@/brands'

/*
 * Cookie consent: Google Consent Mode v2 defaults, then the brand's CookieYes banner, then the brand's GTM container.
 * All are plain tags in the server HTML, so they run in this order while the page parses, before GPT or any Google tag
 * can load. GTM starts under the denied defaults; there is no <noscript> iframe, because it would bypass consent.
 *
 * Everything starts denied. CookieYes (with Google Consent Mode support on in its dashboard) sends the visitor's
 * choice as a consent update; GptLoader waits for the advertising category before loading ads.
 */
const CONSENT_DEFAULTS = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:2000});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);`

// CookieYes appends its banner, preferences and revisit button to <body>, outside the brand shell that carries the
// brand colours, so they get the same variables here. The rest of the restyle is in globals.css.
const COOKIEYES_ROOTS = '.cky-consent-container,.cky-modal,.cky-btn-revisit-wrapper'

const brandColors = (brand: BrandKey) =>
  `${COOKIEYES_ROOTS}{${Object.entries(brandColorVars(BRANDS[brand].colors))
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`

// The client's containers are live and send to their production GA4, so only an explicit flag loads them.
const GTM_ENABLED = process.env.NEXT_PUBLIC_GTM_ENABLED === 'true'

/** JSON safe inside an inline <script>: no `<` can close the tag. */
const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

// Page context first, so GTM can attach `publication` to every GA4 hit; then the standard GTM loader.
const gtmLoader = (brand: BrandKey) =>
  `dataLayer.push(${inlineJson({ publication: brand, site_env: process.env.NEXT_PUBLIC_SITE_ENV ?? 'development' })});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer',${inlineJson(BRANDS[brand].gtmId)});`

/** The consent scripts for the brand's live pages. Not rendered in draft mode, so the banner never covers previews. */
export function CookieConsent({ brand }: { brand: BrandKey }) {
  return (
    <>
      <script id="consent-defaults" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS }} />
      <style>{brandColors(brand)}</style>
      {/* Synchronous on purpose: async, React would hoist it into <head> ahead of the defaults above. */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script id="cookieyes" src={`https://cdn-cookieyes.com/client_data/${BRANDS[brand].cookieYesId}/script.js`} />
      {GTM_ENABLED && <script id="gtm" dangerouslySetInnerHTML={{ __html: gtmLoader(brand) }} />}
    </>
  )
}
