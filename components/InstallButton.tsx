'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSToast, setShowIOSToast] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Detect iOS
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Listen for the install prompt (Chrome, Edge, Samsung Internet)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    const installedHandler = () => setInstalled(true)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  if (installed) return null

  // Hide if not installable and not iOS
  if (!deferredPrompt && !isIOS) return null

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSToast(true)
      setTimeout(() => setShowIOSToast(false), 6000)
      return
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="btn-ghost"
        style={{
          fontSize: 15,
          padding: '11px 24px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Install App
      </button>

      {showIOSToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1c1c1e',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: 14,
          fontSize: 15,
          lineHeight: 1.5,
          zIndex: 9999,
          maxWidth: 340,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid #333',
        }}>
          Tap <strong style={{ fontSize: 18 }}>⎋</strong> (Share) then <strong>"Add to Home Screen"</strong>
        </div>
      )}
    </>
  )
}
