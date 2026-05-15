import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How listings are verified',
  description:
    'How BisDak verifies Filipino-owned business listings, what claim and badge statuses mean, and how to claim your business.',
  alternates: { canonical: '/verification' },
}

export default function VerificationPage() {
  return (
    <main>
      <Nav />
      <article style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
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
          <p style={{ color: '#36F4A4', fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 16px' }}>
            Verification
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 330, lineHeight: 1.1, margin: '0 0 24px' }}>
            How listings are verified
          </h1>
          <p style={{ margin: '0 0 28px' }}>
            BisDak is a curated directory, not a scraper. Every listing on the site has been
            through one of the verification paths below, and every listing is open for owners
            to claim and update at any time.
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '32px 0 12px' }}>Community-submitted</h2>
          <p style={{ margin: '0 0 24px' }}>
            Someone — usually a customer, the owner, or a community member — submits the
            business through our <Link href="/submit" style={{ color: '#36F4A4', textDecoration: 'none' }}>free submission form</Link>.
            We check the business is real (NZ-registered, contactable, Filipino-owned or
            Filipino-run) before publishing. Most listings fall into this category.
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '32px 0 12px' }}>Phone-verified</h2>
          <p style={{ margin: '0 0 24px' }}>
            We&apos;ve called the business on the listed number and confirmed the listing
            details. Phone-verified listings carry a 📞 badge.
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '32px 0 12px' }}>Owner-claimed</h2>
          <p style={{ margin: '0 0 24px' }}>
            The business owner has claimed the listing through their BisDak account. Claimed
            listings carry a ✓ badge and unlock owner-only features: respond to reviews,
            update contact details, post jobs, and add photos. To claim your business, sign
            in on the listing page and click &ldquo;Claim this listing&rdquo;.
          </p>

          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 400, margin: '32px 0 12px' }}>What we won&apos;t do</h2>
          <p style={{ margin: '0 0 16px' }}>
            We don&apos;t publish listings for businesses that are not genuinely Filipino-owned
            or Filipino-run. We don&apos;t accept paid placement in exchange for verification
            badges. We don&apos;t share phone numbers or email addresses with third parties.
          </p>
          <p style={{ margin: '0 0 28px' }}>
            Found a listing that should be removed or updated? Email{' '}
            <a href="mailto:hello@bisdak.co.nz" style={{ color: '#36F4A4', textDecoration: 'none' }}>hello@bisdak.co.nz</a>{' '}
            and we&apos;ll review it within a day or two.
          </p>
        </section>
      </article>
    </main>
  )
}
