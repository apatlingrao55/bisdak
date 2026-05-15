import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About BisDak',
  description:
    "About BisDak — New Zealand's directory of Filipino-owned businesses, built by and for the Kiwi-Filipino community.",
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
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
            maxWidth: 760,
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
            About
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
            New Zealand&apos;s Filipino business hub
          </h1>

          <p style={{ margin: '0 0 20px' }}>
            BisDak is a directory of Filipino-owned businesses across Aotearoa New Zealand,
            built by and for the Kiwi-Filipino community. The name &ldquo;BisDak&rdquo; is
            Cebuano slang for &ldquo;Bisaya&rdquo; — the Visayan-speaking peoples of the
            central and southern Philippines. It&apos;s a small nod to where many of us are
            from, while welcoming kababayan from every region of the Philippines.
          </p>

          <p style={{ margin: '0 0 20px' }}>
            We list businesses across eight categories — Food &amp; Dining, Professional
            Services, Health &amp; Wellness, Trades &amp; Home Services, Beauty &amp;
            Personal Care, Remittance &amp; Travel, Retail &amp; Groceries, and Community
            &amp; Events — covering all major NZ regions including Auckland, Wellington,
            Canterbury, Waikato, and beyond.
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '36px 0 14px' }}>
            How listings get on BisDak
          </h2>
          <p style={{ margin: '0 0 20px' }}>
            Listings come from two sources. Businesses owners or community members can submit
            a listing through our <Link href="/submit" style={{ color: '#36F4A4', textDecoration: 'none' }}>free submission form</Link>
            {' '}— it takes about two minutes. We also import publicly-listed Filipino businesses
            from NZ Companies Office records and community Facebook groups, then verify them
            before publishing. Business owners can claim their listing at any time to update
            their details and respond to reviews.
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '36px 0 14px' }}>
            What we publish beyond listings
          </h2>
          <p style={{ margin: '0 0 20px' }}>
            We also publish a community <Link href="/blog" style={{ color: '#36F4A4', textDecoration: 'none' }}>blog</Link>{' '}
            covering NZ immigration, balikbayan shipping, employment guides, and stories
            about Filipino-owned businesses; a small <Link href="/jobs" style={{ color: '#36F4A4', textDecoration: 'none' }}>jobs board</Link>{' '}
            of roles at Filipino businesses; and free <Link href="/tools" style={{ color: '#36F4A4', textDecoration: 'none' }}>NZ-specific calculators</Link>{' '}
            (mortgage, PAYE, GST, NZD/PHP currency, and a Manila&nbsp;↔&nbsp;Auckland time-zone helper).
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '36px 0 14px' }}>
            Get in touch
          </h2>
          <p style={{ margin: '0 0 20px' }}>
            Email us at <a href="mailto:hello@bisdak.co.nz" style={{ color: '#36F4A4', textDecoration: 'none' }}>hello@bisdak.co.nz</a>{' '}
            for media, partnership, or business-listing enquiries. For general support visit{' '}
            <Link href="/contact" style={{ color: '#36F4A4', textDecoration: 'none' }}>our contact page</Link>.
          </p>
        </section>
      </article>
    </main>
  )
}
