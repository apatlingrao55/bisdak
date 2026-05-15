import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: { absolute: '404 — Page not found · BisDak NZ' },
  description: 'The page you are looking for could not be found.',
  // Next.js auto-emits `<meta name="robots" content="noindex">` for not-found
  // responses. Setting `robots` here adds a second tag — leave it unset.
  alternates: { canonical: null },
  openGraph: { url: undefined, images: [] },
}

export default function NotFound() {
  return (
    <main>
      <Nav />
      <section
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 560, padding: '64px 24px', textAlign: 'center' }}>
          <p
            style={{
              color: '#36F4A4',
              fontSize: 13,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 500,
              margin: '0 0 16px',
            }}
          >
            404
          </p>
          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 330,
              margin: '0 0 16px',
            }}
          >
            Page not found
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: 17, margin: '0 0 32px', lineHeight: 1.6 }}>
            We couldn&apos;t find what you were looking for. The listing may have moved or been removed.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn-primary" style={{ fontSize: 15, padding: '12px 24px' }}>
              Back to home
            </Link>
            <Link href="/search" className="btn-ghost" style={{ fontSize: 15, padding: '12px 24px' }}>
              Browse businesses
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
