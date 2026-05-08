import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const BASE = 'https://bisdak.co.nz'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'BisDak — Pinoy Business Hub NZ',
    template: '%s — BisDak NZ',
  },
  description: "New Zealand's definitive directory of Filipino-owned businesses. Find your kababayan's business at bisdak.co.nz.",
  keywords: ['Filipino businesses New Zealand', 'Pinoy business NZ', 'Filipino directory NZ', 'BisDak', 'Filipino-owned NZ'],
  authors: [{ name: 'BisDak Team', url: BASE }],
  creator: 'BisDak',
  openGraph: {
    type: 'website',
    locale: 'en_NZ',
    url: BASE,
    siteName: 'BisDak — Pinoy Business Hub NZ',
    title: 'BisDak — Pinoy Business Hub NZ',
    description: "New Zealand's definitive directory of Filipino-owned businesses.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BisDak — Pinoy Business Hub NZ',
    description: "New Zealand's definitive directory of Filipino-owned businesses.",
  },
  alternates: { canonical: BASE },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
