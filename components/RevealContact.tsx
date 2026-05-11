'use client'
import { useState } from 'react'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'shown'; phone: string | null; email: string | null }
  | { kind: 'error'; message: string }

type Props = { slug: string }

export default function RevealContact({ slug }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function reveal() {
    setState({ kind: 'loading' })
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/contact`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      })
      if (res.status === 429) {
        setState({ kind: 'error', message: 'Too many requests. Try again in a minute.' })
        return
      }
      if (!res.ok) {
        setState({ kind: 'error', message: 'Unavailable. Try again later.' })
        return
      }
      const data = (await res.json()) as { phone: string | null; email: string | null }
      setState({ kind: 'shown', phone: data.phone, email: data.email })
    } catch {
      setState({ kind: 'error', message: 'Unavailable. Try again later.' })
    }
  }

  if (state.kind === 'shown') {
    if (!state.phone && !state.email) {
      return (
        <span style={{ color: '#A1A1AA', fontSize: 14, padding: '14px 0' }}>
          No public contact info on file.
        </span>
      )
    }
    return (
      <>
        {state.phone && (
          <a href={`tel:${state.phone}`} className="btn-primary" style={{ fontSize: 16, padding: '14px 28px' }}>
            📞 {state.phone}
          </a>
        )}
        {state.email && (
          <a href={`mailto:${state.email}`} className="btn-ghost" style={{ fontSize: 16, padding: '14px 28px' }}>
            ✉️ Email
          </a>
        )}
      </>
    )
  }

  if (state.kind === 'error') {
    return (
      <span style={{ color: '#F472B6', fontSize: 14, padding: '14px 0' }}>{state.message}</span>
    )
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={state.kind === 'loading'}
      className="btn-primary"
      style={{ fontSize: 16, padding: '14px 28px' }}
    >
      {state.kind === 'loading' ? 'Loading…' : '📞 Show contact'}
    </button>
  )
}
