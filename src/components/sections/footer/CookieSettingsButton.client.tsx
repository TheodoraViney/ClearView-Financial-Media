'use client'

import { openCookieSettings } from '@/lib/consent'

/** Footer link that reopens the cookie preferences, so a visitor can change or withdraw consent at any time. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="cursor-pointer self-start underline-offset-2 hover:text-foreground hover:underline focus-visible:text-foreground"
      onClick={openCookieSettings}
    >
      {label}
    </button>
  )
}
