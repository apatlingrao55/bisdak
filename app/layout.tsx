import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import RouteProgress from '@/components/RouteProgress'

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
}

const siteJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE}/#organization`,
    name: 'BisDak',
    url: BASE,
    logo: { '@type': 'ImageObject', url: `${BASE}/icons/icon-512x512.png` },
    description: "New Zealand's directory of Filipino-owned businesses.",
    areaServed: 'NZ',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE}/#website`,
    url: BASE,
    name: 'BisDak — Pinoy Business Hub NZ',
    publisher: { '@id': `${BASE}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#02090A" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}
document.addEventListener('submit',function(e){var b=e.target.querySelector('button[type="submit"]');if(b){b.disabled=true;b.style.opacity='0.5'}})`,
          }}
        />
      </body>
    </html>
  )
}
