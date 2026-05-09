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
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowIOSToast(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 9998,
            }}
          />
          {/* Guide card */}
          <div style={{
            position: 'fixed',
            bottom: 24,
            left: 16,
            right: 16,
            maxWidth: 380,
            margin: '0 auto',
            background: '#1c1c1e',
            color: '#fff',
            padding: '28px 24px 20px',
            borderRadius: 20,
            zIndex: 9999,
            boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
            border: '1px solid #333',
          }}>
            {/* Close */}
            <button
              onClick={() => setShowIOSToast(false)}
              style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#71717a', fontSize: 20, cursor: 'pointer' }}
            >
              &times;
            </button>

            <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px', textAlign: 'center' }}>
              Install BisDak
            </p>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="14" width="18" height="7" rx="2" stroke="#007AFF" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                    Tap the <span style={{ color: '#007AFF' }}>Share</span> button
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8e8e93' }}>
                    At the bottom of Safari
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ textAlign: 'center', color: '#48484a', fontSize: 18, lineHeight: 1 }}>&#8595;</div>

              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="4" stroke="#007AFF" strokeWidth="2" fill="none"/>
                    <path d="M12 8v8M8 12h8" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                    Tap <span style={{ color: '#007AFF' }}>"Add to Home Screen"</span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8e8e93' }}>
                    Scroll down if you don't see it
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ textAlign: 'center', color: '#48484a', fontSize: 18, lineHeight: 1 }}>&#8595;</div>

              {/* Step 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                    Tap <span style={{ color: '#34C759' }}>"Add"</span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8e8e93' }}>
                    BisDak appears on your home screen
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom pointer triangle */}
            <div style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid #1c1c1e',
            }} />
          </div>
        </>
      )}
    </>
  )
}
