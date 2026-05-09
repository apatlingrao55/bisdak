'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

export default function VerifyForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const initialError = searchParams.get('error') ?? ''
  const resent = searchParams.get('resent') === '1'

  const [code, setCode] = useState('')
  const [error, setError] = useState(initialError)
  const [message, setMessage] = useState(resent ? 'New code sent!' : '')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const formData = new FormData()
    formData.set('email', email)
    formData.set('code', code)

    const res = await fetch('/api/auth/verify-otp', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
    } else {
      window.location.href = '/auth/sign-in?verified=1'
    }
  }

  async function handleResend() {
    setError('')
    setMessage('')
    setResending(true)

    const formData = new FormData()
    formData.set('email', email)

    const res = await fetch('/api/auth/resend-otp', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setMessage('New code sent! Check your inbox.')
      setCode('')
    }
    setResending(false)
  }

  return (
    <div
      style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '40px' }}
      className="shadow-card"
    >
      <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px' }}>
        Verify Your Email
      </h1>
      <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 32px', lineHeight: 1.5 }}>
        We sent a 6-digit code to{' '}
        <strong style={{ color: '#ffffff' }}>{maskEmail(email)}</strong>
      </p>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#EF4444',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          background: 'rgba(54,244,164,0.1)',
          border: '1px solid rgba(54,244,164,0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#36F4A4',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
            Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input-dark"
            style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          style={{ height: '48px', marginTop: '8px' }}
          disabled={loading || code.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button
          onClick={handleResend}
          disabled={resending}
          style={{
            background: 'none',
            border: 'none',
            color: '#36F4A4',
            fontSize: '14px',
            cursor: resending ? 'default' : 'pointer',
            opacity: resending ? 0.5 : 1,
          }}
        >
          {resending ? 'Sending...' : "Didn't receive it? Resend code"}
        </button>
      </div>
    </div>
  )
}
