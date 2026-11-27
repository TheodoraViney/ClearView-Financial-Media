import type { Metadata } from 'next'
import { Onest } from 'next/font/google'

import './globals.css'

const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin'],
})

// Neutral fallback only: src/app/sites/[brand]/layout.tsx sets every brand page's metadata from Brand settings, and
// the Studio sets its own title.
export const metadata: Metadata = {
  title: 'WealthBriefing Group',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${onest.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  )
}
