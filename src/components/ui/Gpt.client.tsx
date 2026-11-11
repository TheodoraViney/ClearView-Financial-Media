'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'

import { adUnitPath, type AdUnitView } from '@/lib/gam'

import { cx } from './cx'

/*
 * Google Publisher Tag (GPT), the script Google Ad Manager serves ads through. GptLoader, once in the brand layout
 * outside draft mode, waits for advertising consent, configures GPT and loads it. Each AdFill registers its slot
 * only after that, so nothing reaches Google before consent, and drops it again on withdrawal or unmount.
 */

// The part of the GPT API this file uses. No @types package: it would be a new dependency for five methods.
type Targeting = { targeting: Record<string, string> }
type LazyLoad = { lazyLoad: { fetchMarginPercent: number; renderMarginPercent: number; mobileScaling: number } }
type GptSlot = { addService(service: GptPubAds): GptSlot; setConfig(config: Targeting): void }
type SlotRenderEnded = { slot: GptSlot; isEmpty: boolean }
type GptPubAds = {
  addEventListener(type: 'slotRenderEnded', listener: (event: SlotRenderEnded) => void): void
  removeEventListener(type: 'slotRenderEnded', listener: (event: SlotRenderEnded) => void): void
}
type GoogleTag = {
  defineSlot(path: string, size: [number, number], elementId: string): GptSlot | null
  pubads(): GptPubAds
  setConfig(config: Targeting | LazyLoad): void
  enableServices(): void
  display(elementId: string): void
  destroySlots(slots?: GptSlot[]): boolean
}
type GptWindow = Window & { googletag?: { cmd: { push(callback: () => void): void } } }

// CookieYes, which the Publisher runs on every domain. Absent until its script is on the page.
type CookieYesWindow = Window & { getCkyConsent?: () => { categories?: { advertisement?: boolean } } }

/** Runs a GPT command now if GPT is loaded, or once it loads. */
function gpt(command: (googletag: GoogleTag) => void) {
  const w = window as GptWindow
  const queue = (w.googletag ??= { cmd: [] as Array<() => void> })

  queue.cmd.push(() => command(w.googletag as unknown as GoogleTag))
}

// Whether slots may register: advertising consent given and GPT configured. One flag for every AdFill on the page.
let ready = false
let configured = false
const listeners = new Set<() => void>()

function setReady(value: boolean) {
  ready = value
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Loads ads without waiting for consent, while CookieYes is not on the site yet. Remove the variable once it is:
// without consent handling, ads must never run on the live domains.
const SKIP_CONSENT = process.env.NEXT_PUBLIC_ADS_SKIP_CONSENT === 'true'

const advertisingConsent = () =>
  SKIP_CONSENT || (window as CookieYesWindow).getCkyConsent?.().categories?.advertisement === true

// CookieYes fires these on the document when its banner loads with a stored choice and when the visitor changes it.
const subscribeConsent = (listener: () => void) => {
  document.addEventListener('cookieyes_banner_load', listener)
  document.addEventListener('cookieyes_consent_update', listener)

  return () => {
    document.removeEventListener('cookieyes_banner_load', listener)
    document.removeEventListener('cookieyes_consent_update', listener)
  }
}

/** Loads GPT for the page once advertising consent is given. Renders nothing before that. */
export function GptLoader({ publication }: { publication: string }) {
  const granted = useSyncExternalStore(subscribeConsent, advertisingConsent, () => false)

  useEffect(() => {
    if (!granted) {
      return
    }

    if (!configured) {
      configured = true
      gpt((googletag) => {
        googletag.setConfig({ targeting: { publication } })
        // Fetch a screen ahead, render half a screen ahead; twice that on mobile, where scrolling is faster.
        googletag.setConfig({ lazyLoad: { fetchMarginPercent: 100, renderMarginPercent: 50, mobileScaling: 2 } })
        googletag.enableServices()
      })
    }

    setReady(true)

    // Withdrawal: every AdFill destroys its slot. GPT itself stays loaded; a reload starts clean.
    return () => setReady(false)
  }, [granted, publication])

  return granted ? <Script src="https://securepubads.g.doubleclick.net/tag/js/gpt.js" strategy="afterInteractive" /> : null
}

/** The page type sent with every ad request, for line items that target it. */
function pageType(pathname: string): string {
  if (pathname === '/') {
    return 'home'
  }

  return pathname.startsWith('/posts/') || pathname.startsWith('/archive/') ? 'article' : 'page'
}

/**
 * The ad inside a reserved banner box. Covers the box (and the editor-only label) once a creative fills it. Requests
 * the largest of the unit's sizes the box fits (a leaderboard box under 728px wide asks for 468 × 60), measured once
 * when the slot registers; nothing when no size fits or the box is hidden (`AD_SLOT_FITS` hides a leaderboard box under
 * 468px). The box keeps its size either way, so nothing shifts.
 */
export function AdFill({ unit }: { unit: AdUnitView }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = `gpt-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const pathname = usePathname()
  const canRegister = useSyncExternalStore(subscribe, () => ready, () => false)
  const [filled, setFilled] = useState(false)
  const { code, sizes } = unit
  // A string, so a re-render with an equal (but new) sizes array keeps the slot.
  const sizesKey = sizes.map((size) => size.join('x')).join(',')

  useEffect(() => {
    const box = ref.current?.parentElement
    // Border included: the ad layer covers the box's 1px border, so a 300 × 250 creative fills a 300 × 250 MPU box.
    const size =
      box &&
      sizesKey
        .split(',')
        .map((value) => value.split('x').map(Number))
        .find(([width, height]) => box.offsetWidth >= width && box.offsetHeight >= height)

    if (!canRegister || !size) {
      return
    }

    let slot: GptSlot | null = null
    const onRender = (event: SlotRenderEnded) => {
      if (event.slot === slot) {
        setFilled(!event.isEmpty)
      }
    }

    gpt((googletag) => {
      slot = googletag.defineSlot(adUnitPath(code), [size[0], size[1]], id)

      if (!slot) {
        return
      }

      slot.addService(googletag.pubads()).setConfig({ targeting: { page_type: pageType(pathname) } })
      googletag.pubads().addEventListener('slotRenderEnded', onRender)
      googletag.display(id)
    })

    return () => {
      setFilled(false)
      gpt((googletag) => {
        googletag.pubads().removeEventListener('slotRenderEnded', onRender)

        if (slot) {
          googletag.destroySlots([slot])
        }
      })
    }
  }, [canRegister, code, sizesKey, id, pathname])

  return (
    <div
      ref={ref}
      id={id}
      className={cx('absolute -inset-px flex items-center justify-center', filled ? 'bg-ad-surface' : 'pointer-events-none')}
    />
  )
}
