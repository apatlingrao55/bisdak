'use client'

import { useState } from 'react'

export default function ShareButton({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://bisdak.co.nz/business/${slug}`

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on BisDak`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* clipboard unavailable */ }
    }
  }

  return (
    <button onClick={handleShare} className="btn-ghost"
      style={{ fontSize: '15px', padding: '10px 20px' }}>
      {copied ? '✓ Copied!' : '📤 Share'}
    </button>
  )
}
