import Nav from '@/components/Nav'

export const metadata = { title: 'Terms of Use' }

export default function TermsPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Terms of Use</h1>
          <p style={{ color: '#71717A', fontSize: 13, marginBottom: 40 }}>Effective 9 May 2026</p>

          <p>These terms govern your use of <strong>bisdak.co.nz</strong> (&ldquo;BisDak&rdquo;, &ldquo;the Site&rdquo;), operated by BisDak (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By creating an account or using the Site, you agree to these terms.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>1. About BisDak</h2>
          <p>BisDak is a free online directory listing Filipino-owned businesses in New Zealand. We provide a platform for business owners to list their businesses and for users to discover them.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>2. Eligibility</h2>
          <p>You must be at least 16 years old to create an account. By registering, you confirm that the information you provide is accurate and complete.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>3. Your Account</h2>
          <p>You are responsible for maintaining the confidentiality of your password and for all activity under your account. You must notify us immediately if you suspect unauthorised access.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>4. Business Listings</h2>
          <p>By submitting a business listing, you represent that:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>The information is accurate and you have the right to submit it</li>
            <li>The business is Filipino-owned or operated</li>
            <li>You grant BisDak a non-exclusive, royalty-free licence to display the listing on the Site</li>
          </ul>
          <p>We reserve the right to remove or edit listings that violate these terms or are inaccurate.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>5. Reviews</h2>
          <p>Reviews must be honest, based on genuine experience, and must not contain:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Defamatory, abusive, or threatening language</li>
            <li>Spam, advertising, or promotional content</li>
            <li>Personal information of others without consent</li>
            <li>False or misleading statements</li>
          </ul>
          <p>We may remove reviews that violate these guidelines.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>6. Claiming a Business</h2>
          <p>If you claim ownership of a listed business, you must verify your identity via email. False claims may result in account suspension.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>7. Acceptable Use</h2>
          <p>You must not:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Use the Site for any unlawful purpose</li>
            <li>Scrape, crawl, or harvest data from the Site without permission</li>
            <li>Attempt to gain unauthorised access to accounts or systems</li>
            <li>Interfere with the Site&apos;s operation or security</li>
            <li>Impersonate another person or entity</li>
          </ul>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>8. Intellectual Property</h2>
          <p>The BisDak name, logo, and website design are our property. User-submitted content (listings, reviews) remains the property of the submitter, with a licence granted to BisDak as described in Section 4.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by New Zealand law, including the Consumer Guarantees Act 1993:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>BisDak is provided &ldquo;as is&rdquo; without warranties of any kind</li>
            <li>We are not liable for the accuracy of business listings or reviews</li>
            <li>We are not liable for any loss arising from your use of the Site or reliance on directory information</li>
            <li>Our total liability is limited to NZ$100</li>
          </ul>
          <p>Nothing in these terms excludes or limits any rights you have under the Consumer Guarantees Act 1993 that cannot be lawfully excluded.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>10. Termination</h2>
          <p>We may suspend or terminate your account at any time for breach of these terms. You may delete your account at any time by contacting us at <strong>alex@aiconsult.co.nz</strong>.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>11. Governing Law</h2>
          <p>These terms are governed by the laws of New Zealand. Any disputes will be subject to the exclusive jurisdiction of New Zealand courts.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>12. Changes</h2>
          <p>We may update these terms from time to time. Continued use of the Site after changes constitutes acceptance of the updated terms.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>13. Contact</h2>
          <p>Email: <strong>alex@aiconsult.co.nz</strong></p>
        </article>
      </div>
    </main>
  )
}
