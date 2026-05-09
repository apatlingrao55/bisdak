import Nav from '@/components/Nav'

export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: '#71717A', fontSize: 13, marginBottom: 40 }}>Effective 9 May 2026</p>

          <p>BisDak (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates <strong>bisdak.co.nz</strong>, a directory of Filipino-owned businesses in New Zealand. This policy explains what personal information we collect, why we collect it, and your rights under the <strong>Privacy Act 2020 (NZ)</strong>.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>1. Information We Collect</h2>
          <p><strong>Account information:</strong> When you create an account we collect your name, email address, and a hashed password. We never store your password in plain text.</p>
          <p><strong>Business listings:</strong> If you submit or claim a business, we collect the business name, category, location, contact details, and description you provide. This information is published on the directory.</p>
          <p><strong>Reviews:</strong> When you leave a review, we collect your display name, suburb, rating, and review text.</p>
          <p><strong>Technical data:</strong> We automatically collect IP addresses, browser type, and pages visited for security and analytics purposes.</p>
          <p><strong>Cookies:</strong> See our <a href="/cookies" style={{ color: '#36F4A4' }}>Cookie Policy</a> for details.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>2. How We Use Your Information</h2>
          <ul style={{ paddingLeft: 20 }}>
            <li>To operate and maintain the BisDak directory</li>
            <li>To verify your email address via one-time codes</li>
            <li>To process business submissions, claims, and reviews</li>
            <li>To send transactional emails (verification codes, claim status updates)</li>
            <li>To protect against fraud and abuse</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>We do <strong>not</strong> sell your personal information to third parties.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>3. Legal Basis</h2>
          <p>We process your personal information under the <strong>Information Privacy Principles (IPPs)</strong> of the Privacy Act 2020. We only collect information that is necessary for the purposes described above (IPP 1), directly from you where practicable (IPP 2), and with your knowledge (IPP 3).</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>4. Data Sharing</h2>
          <p>We may share your information with:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Supabase</strong> (database hosting, based in the US)</li>
            <li><strong>Vercel</strong> (website hosting, based in the US)</li>
            <li><strong>Resend</strong> (transactional email delivery)</li>
          </ul>
          <p>These providers process data on our behalf and are bound by their own privacy policies. By using BisDak, you acknowledge that your data may be transferred to and stored in the United States.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>5. Data Retention</h2>
          <p>We retain your account information for as long as your account is active. Business listings remain published unless you request removal. You may request deletion of your account and personal data at any time by contacting us.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>6. Your Rights</h2>
          <p>Under the Privacy Act 2020, you have the right to:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Access</strong> your personal information (IPP 6)</li>
            <li><strong>Correct</strong> inaccurate information (IPP 7)</li>
            <li><strong>Request deletion</strong> of your personal data</li>
          </ul>
          <p>To exercise these rights, email <strong>alex@aiconsult.co.nz</strong>. We will respond within 20 working days.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>7. Data Breaches</h2>
          <p>If we experience a data breach that poses a risk of serious harm, we will notify the Office of the Privacy Commissioner and affected individuals as required under Part 6A of the Privacy Act 2020.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>8. Children</h2>
          <p>BisDak is not intended for use by anyone under 16 years of age. We do not knowingly collect personal information from children.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>9. Changes</h2>
          <p>We may update this policy from time to time. Material changes will be posted on this page with an updated effective date.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>10. Contact</h2>
          <p>For privacy enquiries or complaints, contact:</p>
          <p>BisDak<br />Email: <strong>alex@aiconsult.co.nz</strong></p>
          <p>If you are not satisfied with our response, you may complain to the <a href="https://www.privacy.org.nz" style={{ color: '#36F4A4' }} target="_blank" rel="noopener noreferrer">Office of the Privacy Commissioner</a>.</p>
        </article>
      </div>
    </main>
  )
}
