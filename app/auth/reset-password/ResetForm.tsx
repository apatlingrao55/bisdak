'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ResetForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const masked = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.set('email', email)
    formData.set('code', code)
    formData.set('password', password)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      setSuccess(true)
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Password Reset</h2>
        <p style={{ color: '#A1A1AA', fontSize: 15, marginBottom: 28 }}>
          Your password has been updated. You can now sign in.
        </p>
        <a href="/auth/sign-in" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>
          Sign In
        </a>
      </div>
    )
  }

  return (
    <>
      <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px' }}>Reset Password</h1>
      <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 32px' }}>
        Enter the 6-digit code sent to <strong style={{ color: '#fff' }}>{masked}</strong> and choose a new password.
      </p>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          color: '#F87171',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>6-Digit Code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="input-dark"
            style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
          />
        </div>
        <div>
          <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>New Password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="input-dark"
          />
        </div>
        <div>
          <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Confirm Password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="input-dark"
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          style={{ height: '48px', marginTop: '8px' }}
          disabled={loading || code.length !== 6}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p style={{ color: '#71717A', fontSize: '14px', textAlign: 'center', margin: '24px 0 0' }}>
        Didn&apos;t get the code?{' '}
        <a href="/auth/forgot-password" style={{ color: '#36F4A4', textDecoration: 'none' }}>Try again</a>
      </p>
    </>
  )
}
