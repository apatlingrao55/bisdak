'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const NAV_START_EVENT = 'bisdak:nav-start'
const COLOR = '#36F4A4'
const SAFETY_TIMEOUT_MS = 10_000

type Phase = 'idle' | 'running' | 'finishing'

export default function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [width, setWidth] = useState(0)
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const phaseRef = useRef<Phase>('idle')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const finish = () => {
    if (phaseRef.current === 'idle') return
    clearTimers()
    setPhase('finishing')
    setWidth(100)
    timersRef.current.push(
      setTimeout(() => {
        setPhase('idle')
        setWidth(0)
      }, 280),
    )
  }

  const start = () => {
    if (phaseRef.current !== 'idle') return
    clearTimers()
    setPhase('running')
    setWidth(0)
    timersRef.current.push(setTimeout(() => setWidth(30), 16))
    timersRef.current.push(setTimeout(() => setWidth(80), 120))
    timersRef.current.push(setTimeout(finish, SAFETY_TIMEOUT_MS))
  }

  useEffect(() => {
    const onStart = () => start()
    window.addEventListener(NAV_START_EVENT, onStart)
    return () => window.removeEventListener(NAV_START_EVENT, onStart)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      const a = target?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href')
      if (!href) return
      if (href.startsWith('#')) return
      if (a.target && a.target !== '_self') return
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return
      if (href === pathname) return
      start()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()])

  useEffect(() => () => clearTimers(), [])

  const visible = phase !== 'idle'
  const widthTransitionMs =
    phase === 'finishing' ? 80 : width === 30 ? 100 : width === 80 ? 700 : 0

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 200,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: `opacity 200ms ease ${phase === 'finishing' ? '80ms' : '0ms'}`,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: COLOR,
          boxShadow: `0 0 8px ${COLOR}`,
          transition: `width ${widthTransitionMs}ms ease-out`,
        }}
      />
    </div>
  )
}
