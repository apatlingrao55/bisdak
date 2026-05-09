import { Suspense } from 'react'
import VerifyForm from './VerifyForm'
import Nav from '@/components/Nav'

export default function VerifyPage() {
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
          <Suspense fallback={
            <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '40px', textAlign: 'center' }} className="shadow-card">
              <p style={{ color: '#A1A1AA' }}>Loading...</p>
            </div>
          }>
            <VerifyForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
