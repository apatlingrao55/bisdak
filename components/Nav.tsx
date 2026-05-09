'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: scrolled ? '#102620' : 'transparent',
      transition: 'background 300ms ease',
      borderBottom: scrolled ? '1px solid #1E2C31' : '1px solid transparent',
    }}>
      <Link
        href="/"
        style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.2px' }}
      >
        🇵🇭 BisDak{' '}
        <span className="hidden sm:inline" style={{ fontWeight: 400, color: '#A1A1AA' }}>
          — Pinoy Business Hub NZ
        </span>
      </Link>

      {/* Desktop nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="hidden md:flex">
        <Link href="/search" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '15px', letterSpacing: '0.3px' }}>
          Browse
        </Link>
        <Link href="/blog" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '15px', letterSpacing: '0.3px' }}>
          News
        </Link>
        <Link href="/submit" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '15px', letterSpacing: '0.3px' }}>
          Submit a Business
        </Link>
        {isLoggedIn ? (
          <>
            <Link href="/dashboard" className="btn-primary" style={{ padding: '7px 18px', fontSize: '14px' }}>
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="btn-ghost"
              style={{ padding: '7px 18px', fontSize: '14px', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/sign-in" className="btn-ghost" style={{ padding: '7px 18px', fontSize: '14px' }}>
              Sign In
            </Link>
            <Link href="/dashboard" className="btn-primary" style={{ padding: '7px 18px', fontSize: '14px' }}>
              Dashboard
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
        aria-label="Toggle navigation menu"
        className="flex md:hidden"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0,
          background: '#02090A',
          borderTop: '1px solid #1E2C31',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }} className="md:hidden">
          <Link href="/search" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
            Browse
          </Link>
          <Link href="/blog" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
            News
          </Link>
          <Link href="/submit" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
            Submit a Business
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
                Dashboard
              </Link>
              <button
                onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                style={{ color: '#F87171', textDecoration: 'none', fontSize: '24px', fontWeight: 300, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/sign-in" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
                Sign In
              </Link>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
                Dashboard
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
