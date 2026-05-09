'use client'

import { useState } from 'react'

type ClaimState = 'idle' | 'sending-otp' | 'otp-sent' | 'verifying' | 'pending' | 'approved' | 'error'

export default function ClaimButton({ businessId }: { businessId: string }) {
  const [state, setState] = useState<ClaimState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [message, setMessage] = useState('')

  async function handleSendOTP() {
    setState('sending-otp')
    setErrorMsg('')
    try {
      const res = await fetch('/api/claims/verify', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setErrorMsg(data.error)
        setState('error')
      } else {
        setState('otp-sent')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    setState('verifying')
    setErrorMsg('')
    try {
      const form = new FormData()
      form.set('businessId', businessId)
      form.set('otpCode', otpCode)
      if (message) form.set('message', message)

      const res = await fetch('/api/claims', { method: 'POST', body: form, redirect: 'manual' })

      if (res.type === 'opaqueredirect') {
        window.location.href = '/dashboard'
        return
      }

      if (res.ok) {
        const data = await res.json()
        setState(data.status === 'approved' ? 'approved' : 'pending')
        if (data.status === 'approved') {
          window.location.href = '/dashboard'
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }))
        setErrorMsg(data.error)
        setState('otp-sent') // Stay on OTP form so they can retry
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  if (state === 'pending') {
    return (
      <span style={{
        background: 'rgba(54,244,164,0.08)',
        color: '#36F4A4',
        border: '1px solid rgba(54,244,164,0.25)',
        borderRadius: '9999px',
        padding: '10px 20px',
        fontSize: '15px',
        fontWeight: 500,
      }}>
        Claim submitted for review
      </span>
    )
  }

  if (state === 'approved') {
    return (
      <span style={{ color: '#36F4A4', fontSize: '15px', fontWeight: 500 }}>
        Claimed! Redirecting...
      </span>
    )
  }

  if (state === 'otp-sent' || state === 'verifying') {
    return (
      <form onSubmit={handleClaim} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: '#A1A1AA', fontSize: '14px', margin: 0 }}>
          A verification code was sent to your email. Enter it below to confirm your claim.
        </p>
        {errorMsg && (
          <span style={{ color: '#F87171', fontSize: '13px' }}>{errorMsg}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          autoFocus
          autoComplete="one-time-code"
          placeholder="000000"
          value={otpCode}
          onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="input-dark"
          style={{ fontSize: '20px', letterSpacing: '6px', textAlign: 'center', maxWidth: '200px' }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={state === 'verifying' || otpCode.length !== 6}
            className="btn-primary"
            style={{ fontSize: '14px', padding: '8px 16px', opacity: state === 'verifying' ? 0.6 : 1 }}
          >
            {state === 'verifying' ? 'Verifying...' : 'Confirm Claim'}
          </button>
          <button
            type="button"
            onClick={() => { setState('idle'); setOtpCode(''); setErrorMsg('') }}
            style={{ background: 'none', border: 'none', color: '#71717A', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <>
      <button
        onClick={handleSendOTP}
        disabled={state === 'sending-otp'}
        className="btn-primary"
        style={{ fontSize: '15px', padding: '10px 20px', opacity: state === 'sending-otp' ? 0.6 : 1 }}
      >
        {state === 'sending-otp' ? 'Sending code...' : 'Claim this business'}
      </button>
      {state === 'error' && (
        <span style={{ color: '#F87171', fontSize: '13px' }}>{errorMsg}</span>
      )}
    </>
  )
}
