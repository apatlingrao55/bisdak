'use client'

import { useState } from 'react'

export default function ClaimButton({ businessId }: { businessId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'pending' | 'approved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleClaim() {
    setState('loading')
    try {
      const form = new FormData()
      form.set('businessId', businessId)

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
        setState('error')
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

  return (
    <>
      <button
        onClick={handleClaim}
        disabled={state === 'loading'}
        className="btn-primary"
        style={{ fontSize: '15px', padding: '10px 20px', opacity: state === 'loading' ? 0.6 : 1 }}
      >
        {state === 'loading' ? 'Claiming...' : 'Claim this business'}
      </button>
      {state === 'error' && (
        <span style={{ color: '#F87171', fontSize: '13px' }}>{errorMsg}</span>
      )}
    </>
  )
}
