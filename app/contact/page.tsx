import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact BisDak',
  description:
    'Contact BisDak by email at hello@bisdak.co.nz. Submit a business, ask about partnerships, or report an issue.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <main>
      <Nav />
      <article
        style={{
          paddingTop: 64,
          minHeight: '100vh',
          background: '#000',
        }}
      >
        <section
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 32px) 64px',
            color: '#D4D4D8',
            fontSize: 17,
            lineHeight: 1.7,
          }}
        >
          <p
            style={{
              color: '#36F4A4',
              fontSize: 12,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 600,
              margin: '0 0 16px',
            }}
          >
            Contact
          </p>
          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 330,
              lineHeight: 1.1,
              margin: '0 0 24px',
            }}
          >
            Get in touch with BisDak
          </h1>
          <p style={{ margin: '0 0 32px' }}>
            BisDak is run by a small Kiwi-Filipino team. The fastest way to reach us is by email.
            For business listings, please use the free submission form below.
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 400, margin: '0 0 12px' }}>Email</h2>
          <p style={{ margin: '0 0 28px' }}>
            <a href="mailto:hello@bisdak.co.nz" style={{ color: '#36F4A4', textDecoration: 'none', fontSize: 18 }}>
              hello@bisdak.co.nz
            </a>
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 400, margin: '0 0 12px' }}>List a business</h2>
          <p style={{ margin: '0 0 28px' }}>
            Filipino-owned business owners and community members can submit a listing for free —
            it takes about two minutes.{' '}
            <Link href="/submit" style={{ color: '#36F4A4', textDecoration: 'none' }}>
              Submit a business →
            </Link>
          </p>

          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 400, margin: '0 0 12px' }}>Other</h2>
          <p style={{ margin: '0 0 8px' }}>
            <Link href="/about" style={{ color: '#36F4A4', textDecoration: 'none' }}>About BisDak</Link>
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <Link href="/verification" style={{ color: '#36F4A4', textDecoration: 'none' }}>How listings are verified</Link>
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <Link href="/privacy" style={{ color: '#36F4A4', textDecoration: 'none' }}>Privacy policy</Link>
          </p>
          <p style={{ margin: 0 }}>
            <Link href="/terms" style={{ color: '#36F4A4', textDecoration: 'none' }}>Terms of use</Link>
          </p>
        </section>
      </article>
    </main>
  )
}
