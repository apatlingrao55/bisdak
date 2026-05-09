import { Suspense } from 'react'
import Nav from '@/components/Nav'
import ResetForm from './ResetForm'

export const metadata = { title: 'Reset Password' }

export default function ResetPasswordPage() {
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
            <Suspense fallback={<p style={{ color: '#A1A1AA' }}>Loading...</p>}>
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
