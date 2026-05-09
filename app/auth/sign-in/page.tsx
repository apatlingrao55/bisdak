import Nav from '@/components/Nav'
import { signInAction } from './actions'

export default function SignInPage() {
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
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px' }}>Sign In</h1>
            <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 32px' }}>
              Access your business dashboard.
            </p>

            <form action={signInAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-dark"
                />
              </div>
              <button type="submit" className="btn-primary" style={{ height: '48px', marginTop: '8px' }}>
                Sign In
              </button>
            </form>

            <p style={{ color: '#71717A', fontSize: '14px', textAlign: 'center', margin: '20px 0 0' }}>
              <a href="/auth/forgot-password" style={{ color: '#A1A1AA', textDecoration: 'none', fontSize: '13px' }}>Forgot password?</a>
            </p>

            <p style={{ color: '#71717A', fontSize: '14px', textAlign: 'center', margin: '16px 0 0' }}>
              Don&apos;t have an account?{' '}
              <a href="/auth/sign-up" style={{ color: '#36F4A4', textDecoration: 'none' }}>Sign up free</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
