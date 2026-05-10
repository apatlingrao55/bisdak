'use client'
import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  jobId: string
  applyUrl: string | null
  applyEmail: string | null
  isSignedIn: boolean
}

export default function ApplyButton({ jobId, applyUrl, applyEmail, isSignedIn }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const triggered = useRef(false)

  const target = applyUrl ?? (applyEmail ? `mailto:${applyEmail}` : null)

  function go() {
    if (!target) return
    if (target.startsWith('mailto:')) window.location.href = target
    else window.open(target, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (triggered.current) return
    if (searchParams?.get('apply') !== '1') return
    if (!isSignedIn || !target) return
    triggered.current = true
    go()
    const url = new URL(window.location.href)
    url.searchParams.delete('apply')
    router.replace(url.pathname + (url.search ? url.search : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isSignedIn])

  function onClick(e: React.MouseEvent) {
    if (!target) {
      e.preventDefault()
      return
    }
    if (!isSignedIn) {
      e.preventDefault()
      const callbackUrl = encodeURIComponent(`/jobs/${jobId}?apply=1`)
      window.location.href = `/auth/sign-in?callbackUrl=${callbackUrl}`
      return
    }
    e.preventDefault()
    go()
  }

  return (
    <button type="button" onClick={onClick} disabled={!target} className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
      {target ? 'Apply now' : 'Application link unavailable'}
    </button>
  )
}
