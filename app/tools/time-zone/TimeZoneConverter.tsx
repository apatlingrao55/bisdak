'use client'
import { useState, useEffect } from 'react'

const AKL = 'Pacific/Auckland'
const MNL = 'Asia/Manila'

/**
 * Convert a wall-clock time in a named time zone to a UTC Date.
 * Standard one-iteration approach: works for any moment that's not in
 * a DST transition gap/overlap (the once-a-year ambiguous hour).
 */
function wallClockToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(naiveUtc))
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === t)?.value ?? 0)
  const dispHrRaw = get('hour')
  const displayedUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    dispHrRaw === 24 ? 0 : dispHrRaw,
    get('minute'),
  )
  const offset = naiveUtc - displayedUtc
  return new Date(naiveUtc + offset)
}

function toLocalInputValue(date: Date, timeZone: string): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(date)
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '00'
  let hh = get('hour')
  if (hh === '24') hh = '00'
  return `${get('year')}-${get('month')}-${get('day')}T${hh}:${get('minute')}`
}

function formatInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function getOffsetHours(date: Date, timeZone: string): number {
  const f = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
  const tzPart = f.formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? ''
  const match = tzPart.match(/([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) + Number(match[3]) / 60)
}

export default function TimeZoneConverter() {
  const [moment, setMoment] = useState<Date | null>(null)

  useEffect(() => {
    setMoment(new Date())
  }, [])

  const aklInputValue = moment ? toLocalInputValue(moment, AKL) : ''

  const handleAklChange = (value: string) => {
    if (!value) return
    const [datePart, timePart] = value.split('T')
    if (!datePart || !timePart) return
    const [y, mo, dy] = datePart.split('-').map(Number)
    const [hr, mn] = timePart.split(':').map(Number)
    if ([y, mo, dy, hr, mn].some(n => Number.isNaN(n))) return
    setMoment(wallClockToUtc(y, mo, dy, hr, mn, AKL))
  }

  const aklOffset = moment ? getOffsetHours(moment, AKL) : 0
  const mnlOffset = moment ? getOffsetHours(moment, MNL) : 0
  const gapHours = moment ? aklOffset - mnlOffset : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Pick a moment (Auckland time)</span>
        <input
          type="datetime-local"
          className="input-dark"
          value={aklInputValue}
          onChange={e => handleAklChange(e.target.value)}
        />
      </label>

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => setMoment(new Date())}
          className="btn-ghost"
          style={{ padding: '8px 18px', fontSize: 14 }}
        >
          Use current time
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
        <Card flag="🇳🇿" label="Auckland, New Zealand" value={moment ? formatInZone(moment, AKL) : '—'} />
        <Card flag="🇵🇭" label="Manila, Philippines" value={moment ? formatInZone(moment, MNL) : '—'} />
      </div>

      {moment && (
        <p style={{ color: '#A1A1AA', fontSize: 14, textAlign: 'center', margin: 0 }}>
          Manila is {Math.abs(gapHours)} hour{Math.abs(gapHours) !== 1 ? 's' : ''} behind Auckland
          {gapHours === 5 ? ' (NZ daylight saving)' : ''}.
        </p>
      )}
    </div>
  )
}

function Card({ flag, label, value }: { flag: string; label: string; value: string }) {
  return (
    <div style={{ padding: 20, background: '#061A1C', border: '1px solid #1E2C31', borderRadius: 12 }}>
      <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 8 }}>
        <span aria-hidden="true">{flag}</span> {label}
      </div>
      <div style={{ color: '#fff', fontSize: 17, fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
    </div>
  )
}
