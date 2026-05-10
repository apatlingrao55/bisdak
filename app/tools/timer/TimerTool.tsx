'use client'
import { useState, useEffect } from 'react'

type Mode = 'stopwatch' | 'countdown'
type SwState = 'idle' | 'running' | 'paused'
type CdState = 'idle' | 'running' | 'paused' | 'done'

const PRESETS = [
  { label: '1 min', sec: 60 },
  { label: '5 min', sec: 5 * 60 },
  { label: '10 min', sec: 10 * 60 },
  { label: '25 min', sec: 25 * 60 },
  { label: '30 min', sec: 30 * 60 },
  { label: '1 hr', sec: 60 * 60 },
] as const

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const clampInt = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(Number.isFinite(v) ? v : min)))

export default function TimerTool() {
  const [mode, setMode] = useState<Mode>('stopwatch')

  // Stopwatch state
  const [swState, setSwState] = useState<SwState>('idle')
  const [swAccumulated, setSwAccumulated] = useState(0)
  const [swStartedAt, setSwStartedAt] = useState<number | null>(null)

  // Countdown state
  const [cdHours, setCdHours] = useState(0)
  const [cdMinutes, setCdMinutes] = useState(5)
  const [cdSeconds, setCdSeconds] = useState(0)
  const [cdState, setCdState] = useState<CdState>('idle')
  const [cdTotalMs, setCdTotalMs] = useState(0)
  const [cdAccumulated, setCdAccumulated] = useState(0)
  const [cdStartedAt, setCdStartedAt] = useState<number | null>(null)

  // Force re-render every 100ms while running so the digits update.
  // Time math is computed from Date.now() — interval is just a paint trigger.
  const [, setTick] = useState(0)
  useEffect(() => {
    const swRunning = swState === 'running'
    const cdRunning = cdState === 'running'
    if (!swRunning && !cdRunning) return
    const id = setInterval(() => setTick(t => t + 1), 100)
    return () => clearInterval(id)
  }, [swState, cdState])

  // Compute current display values from Date.now() (background-tab safe)
  const now = Date.now()
  const swDisplay =
    swState === 'running' && swStartedAt !== null
      ? swAccumulated + (now - swStartedAt)
      : swAccumulated

  const cdRemainingRaw =
    cdState === 'running' && cdStartedAt !== null
      ? cdTotalMs - cdAccumulated - (now - cdStartedAt)
      : cdTotalMs - cdAccumulated
  const cdRemaining = Math.max(0, cdRemainingRaw)

  // Detect countdown completion
  useEffect(() => {
    if (cdState === 'running' && cdRemaining <= 0) {
      setCdState('done')
    }
  }, [cdState, cdRemaining])

  // Stopwatch actions
  const startStopwatch = () => {
    setSwStartedAt(Date.now())
    setSwState('running')
  }
  const pauseStopwatch = () => {
    if (swStartedAt !== null) {
      setSwAccumulated(swAccumulated + (Date.now() - swStartedAt))
    }
    setSwStartedAt(null)
    setSwState('paused')
  }
  const resetStopwatch = () => {
    setSwState('idle')
    setSwAccumulated(0)
    setSwStartedAt(null)
  }

  // Countdown actions
  const startCountdown = () => {
    if (cdState === 'idle') {
      const total = (cdHours * 3600 + cdMinutes * 60 + cdSeconds) * 1000
      if (total <= 0) return
      setCdTotalMs(total)
      setCdAccumulated(0)
      setCdStartedAt(Date.now())
      setCdState('running')
    } else if (cdState === 'paused') {
      setCdStartedAt(Date.now())
      setCdState('running')
    }
  }
  const pauseCountdown = () => {
    if (cdStartedAt !== null) {
      setCdAccumulated(cdAccumulated + (Date.now() - cdStartedAt))
    }
    setCdStartedAt(null)
    setCdState('paused')
  }
  const resetCountdown = () => {
    setCdState('idle')
    setCdTotalMs(0)
    setCdAccumulated(0)
    setCdStartedAt(null)
  }
  const applyPreset = (sec: number) => {
    resetCountdown()
    setCdHours(Math.floor(sec / 3600))
    setCdMinutes(Math.floor((sec % 3600) / 60))
    setCdSeconds(sec % 60)
  }

  const cdDisplay = cdState === 'idle' ? (cdHours * 3600 + cdMinutes * 60 + cdSeconds) * 1000 : cdRemaining
  const cdDone = cdState === 'done'
  const inputsLocked = cdState !== 'idle'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Mode tabs */}
      <div role="tablist" style={{ display: 'flex', gap: 8, padding: 4, background: '#061A1C', border: '1px solid #1E2C31', borderRadius: 9999 }}>
        <Tab active={mode === 'stopwatch'} onClick={() => setMode('stopwatch')}>Stopwatch</Tab>
        <Tab active={mode === 'countdown'} onClick={() => setMode('countdown')}>Countdown</Tab>
      </div>

      {/* Display */}
      <div style={{
        padding: '32px 24px',
        background: '#061A1C',
        border: `1px solid ${cdDone && mode === 'countdown' ? '#F87171' : '#1E2C31'}`,
        borderRadius: 12,
        textAlign: 'center',
        transition: 'border-color 200ms ease',
      }}>
        {mode === 'countdown' && cdDone ? (
          <div style={{
            color: '#F87171',
            fontSize: 'clamp(36px, 8vw, 56px)',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.5px',
          }}>
            Time&apos;s up!
          </div>
        ) : (
          <div style={{
            color: '#fff',
            fontSize: 'clamp(48px, 12vw, 84px)',
            fontWeight: 200,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-2px',
            lineHeight: 1,
          }}>
            {mode === 'stopwatch' ? formatTime(swDisplay) : formatTime(cdDisplay)}
          </div>
        )}
        <div style={{ color: '#A1A1AA', fontSize: 13, marginTop: 12 }}>
          {mode === 'stopwatch'
            ? swState === 'idle' ? 'Ready' : swState === 'running' ? 'Running' : 'Paused'
            : cdState === 'idle' ? 'Set a duration below' : cdState === 'running' ? 'Counting down' : cdState === 'paused' ? 'Paused' : 'Done'}
        </div>
      </div>

      {/* Controls */}
      {mode === 'stopwatch' ? (
        <div style={{ display: 'flex', gap: 10 }}>
          {swState !== 'running' ? (
            <button type="button" onClick={startStopwatch} className="btn-primary" style={{ flex: 1, padding: '14px 18px', justifyContent: 'center' }}>
              {swState === 'paused' ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button type="button" onClick={pauseStopwatch} className="btn-ghost" style={{ flex: 1, padding: '14px 18px', justifyContent: 'center' }}>
              Pause
            </button>
          )}
          <button type="button" onClick={resetStopwatch} className="btn-ghost" style={{ flex: 1, padding: '14px 18px', justifyContent: 'center' }} disabled={swState === 'idle' && swAccumulated === 0}>
            Reset
          </button>
        </div>
      ) : (
        <>
          {/* Countdown duration inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <DurationField label="Hours" value={cdHours} onChange={v => setCdHours(clampInt(v, 0, 23))} disabled={inputsLocked} />
            <DurationField label="Minutes" value={cdMinutes} onChange={v => setCdMinutes(clampInt(v, 0, 59))} disabled={inputsLocked} />
            <DurationField label="Seconds" value={cdSeconds} onChange={v => setCdSeconds(clampInt(v, 0, 59))} disabled={inputsLocked} />
          </div>

          {/* Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.sec)}
                disabled={inputsLocked}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  color: inputsLocked ? '#52525B' : '#fff',
                  border: '1px solid #3F3F46',
                  borderRadius: 9999,
                  fontSize: 13,
                  cursor: inputsLocked ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {cdState !== 'running' && cdState !== 'done' ? (
              <button
                type="button"
                onClick={startCountdown}
                className="btn-primary"
                style={{ flex: 1, padding: '14px 18px', justifyContent: 'center' }}
                disabled={cdState === 'idle' && cdHours * 3600 + cdMinutes * 60 + cdSeconds <= 0}
              >
                {cdState === 'paused' ? 'Resume' : 'Start'}
              </button>
            ) : cdState === 'running' ? (
              <button type="button" onClick={pauseCountdown} className="btn-ghost" style={{ flex: 1, padding: '14px 18px', justifyContent: 'center' }}>
                Pause
              </button>
            ) : null}
            <button type="button" onClick={resetCountdown} className="btn-ghost" style={{ flex: 1, padding: '14px 18px', justifyContent: 'center' }}>
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 16px',
        borderRadius: 9999,
        background: active ? '#36F4A4' : 'transparent',
        color: active ? '#000' : '#fff',
        border: 'none',
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 200ms ease',
      }}
    >
      {children}
    </button>
  )
}

function DurationField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (n: number) => void; disabled: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: '#A1A1AA', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="input-dark"
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{ textAlign: 'center', fontSize: 18, fontVariantNumeric: 'tabular-nums', opacity: disabled ? 0.5 : 1 }}
      />
    </label>
  )
}
