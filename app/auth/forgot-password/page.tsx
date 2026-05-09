import Nav from '@/components/Nav'

export const metadata = { title: 'Forgot Password' }

async function ErrorBanner({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  if (error !== 'rate-limit') return null
  return (
    <div style={{
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 16,
      color: '#F87171',
      fontSize: 14,
    }}>
      Too many attempts. Please try again in an hour.
    </div>
  )
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main>
      <Nav />
      <div style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div
            style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '40px' }}
            className="shadow-card"
          >
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px' }}>Forgot Password</h1>
            <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 32px' }}>
              Enter your email and we&apos;ll send a 6-digit code to reset your password.
            </p>

            <ErrorBanner searchParams={searchParams} />

            <form action="/api/auth/forgot-password" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="input-dark"
                />
              </div>
              <button type="submit" className="btn-primary" style={{ height: '48px', marginTop: '8px' }}>
                Send Reset Code
              </button>
            </form>

            <p style={{ color: '#71717A', fontSize: '14px', textAlign: 'center', margin: '24px 0 0' }}>
              Remember your password?{' '}
              <a href="/auth/sign-in" style={{ color: '#36F4A4', textDecoration: 'none' }}>Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
