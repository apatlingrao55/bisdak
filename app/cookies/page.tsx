import Nav from '@/components/Nav'

export const metadata = { title: 'Cookie Policy' }

export default function CookiePage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Cookie Policy</h1>
          <p style={{ color: '#71717A', fontSize: 13, marginBottom: 40 }}>Effective 9 May 2026</p>

          <p>This policy explains how BisDak (<strong>bisdak.co.nz</strong>) uses cookies and similar technologies.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>1. What Are Cookies</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>2. Cookies We Use</h2>

          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2C31' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#fff', fontWeight: 500 }}>Cookie</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#fff', fontWeight: 500 }}>Purpose</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#fff', fontWeight: 500 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#fff', fontWeight: 500 }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1E2C31' }}>
                  <td style={{ padding: '10px 12px' }}><code style={{ color: '#36F4A4' }}>authjs.session-token</code></td>
                  <td style={{ padding: '10px 12px' }}>Keeps you signed in</td>
                  <td style={{ padding: '10px 12px' }}>Essential</td>
                  <td style={{ padding: '10px 12px' }}>Session</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1E2C31' }}>
                  <td style={{ padding: '10px 12px' }}><code style={{ color: '#36F4A4' }}>authjs.csrf-token</code></td>
                  <td style={{ padding: '10px 12px' }}>Protects against cross-site request forgery</td>
                  <td style={{ padding: '10px 12px' }}>Essential</td>
                  <td style={{ padding: '10px 12px' }}>Session</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1E2C31' }}>
                  <td style={{ padding: '10px 12px' }}><code style={{ color: '#36F4A4' }}>authjs.callback-url</code></td>
                  <td style={{ padding: '10px 12px' }}>Redirects you after sign-in</td>
                  <td style={{ padding: '10px 12px' }}>Essential</td>
                  <td style={{ padding: '10px 12px' }}>Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>BisDak currently uses <strong>essential cookies only</strong>. These are required for the site to function and cannot be disabled. We do not use analytics, advertising, or tracking cookies.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>3. Third-Party Cookies</h2>
          <p>We do not set third-party cookies. Our hosting provider (Vercel) may set performance cookies. Refer to <a href="https://vercel.com/legal/cookie-policy" style={{ color: '#36F4A4' }} target="_blank" rel="noopener noreferrer">Vercel&apos;s Cookie Policy</a> for details.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>4. Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Note that disabling essential cookies may prevent you from signing in or using certain features.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>5. Changes</h2>
          <p>If we introduce analytics or non-essential cookies in the future, we will update this policy and implement a consent mechanism.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>6. Contact</h2>
          <p>Email: <strong>alex@aiconsult.co.nz</strong></p>
        </article>
      </div>
    </main>
  )
}
