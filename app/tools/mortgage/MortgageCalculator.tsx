'use client'
import { useState } from 'react'

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', perYear: 12 },
  { value: 'fortnightly', label: 'Fortnightly', perYear: 26 },
  { value: 'weekly', label: 'Weekly', perYear: 52 },
] as const

type Frequency = (typeof FREQUENCIES)[number]['value']

function calculatePayment(principal: number, annualRatePct: number, years: number, perYear: number): number {
  const r = annualRatePct / 100 / perYear
  const n = Math.round(years * perYear)
  if (n <= 0) return 0
  if (r === 0) return principal / n
  const factor = Math.pow(1 + r, n)
  return (principal * (r * factor)) / (factor - 1)
}

const fmt = (n: number) =>
  n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 })

export default function MortgageCalculator() {
  const [principal, setPrincipal] = useState(500_000)
  const [rate, setRate] = useState(6.5)
  const [years, setYears] = useState(30)
  const [frequency, setFrequency] = useState<Frequency>('monthly')

  const freq = FREQUENCIES.find(f => f.value === frequency)!
  const valid = Number.isFinite(principal) && principal > 0 && Number.isFinite(rate) && rate >= 0 && Number.isFinite(years) && years > 0

  const payment = valid ? calculatePayment(principal, rate, years, freq.perYear) : 0
  const totalPaid = valid ? payment * Math.round(years * freq.perYear) : 0
  const totalInterest = valid ? Math.max(0, totalPaid - principal) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Field label="Loan amount (NZD)">
        <input
          type="number"
          inputMode="decimal"
          min={1}
          step={1000}
          className="input-dark"
          value={Number.isFinite(principal) ? principal : ''}
          onChange={e => setPrincipal(Number(e.target.value))}
        />
      </Field>
      <Field label="Interest rate (% p.a.)">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          className="input-dark"
          value={Number.isFinite(rate) ? rate : ''}
          onChange={e => setRate(Number(e.target.value))}
        />
      </Field>
      <Field label="Loan term (years)">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          step={1}
          className="input-dark"
          value={Number.isFinite(years) ? years : ''}
          onChange={e => setYears(Number(e.target.value))}
        />
      </Field>
      <Field label="Repayment frequency">
        <select className="input-dark" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
          {FREQUENCIES.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>

      {valid && (
        <div style={{ marginTop: 12, padding: 24, background: '#061A1C', border: '1px solid #1E2C31', borderRadius: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>Repayment</div>
            <div style={{ color: '#36F4A4', fontSize: 28, fontWeight: 600 }}>
              {fmt(payment)}{' '}
              <span style={{ fontSize: 14, color: '#A1A1AA', fontWeight: 400 }}>/ {freq.label.toLowerCase()}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1E2C31', paddingTop: 12 }}>
            <Row label="Total interest paid" value={fmt(totalInterest)} />
            <Row label="Total paid over term" value={fmt(totalPaid)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ color: '#A1A1AA', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>{value}</span>
    </div>
  )
}
