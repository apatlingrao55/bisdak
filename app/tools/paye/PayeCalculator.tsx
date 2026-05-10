'use client'
import { useState } from 'react'

// FY 2026/27 NZ tax brackets (1 Apr 2026 onwards). Verify annually.
// Source: https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-rates-for-individuals
const TAX_BRACKETS: Array<{ upTo: number; rate: number }> = [
  { upTo: 15_600, rate: 0.105 },
  { upTo: 53_500, rate: 0.175 },
  { upTo: 78_100, rate: 0.30 },
  { upTo: 180_000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
]

// ACC Earner Levy FY 2026/27 (effective 1 Apr 2026).
// Source: https://www.legislation.govt.nz/regulation/public/2025/0018/latest/LMS1019211.html
const ACC_LEVY_RATE = 0.0175
const ACC_LEVY_CAP_INCOME = 156_641

// Student loan repayment threshold and rate. Verify annually with IRD.
// Source: https://www.ird.govt.nz/student-loans
const STUDENT_LOAN_THRESHOLD_ANNUAL = 24_128
const STUDENT_LOAN_RATE = 0.12

const KIWISAVER_OPTIONS = [0, 3, 3.5, 4, 6, 8, 10] as const

function calcIncomeTax(income: number): number {
  let tax = 0
  let prev = 0
  for (const bracket of TAX_BRACKETS) {
    if (income <= prev) break
    const taxable = Math.min(income, bracket.upTo) - prev
    tax += taxable * bracket.rate
    prev = bracket.upTo
  }
  return tax
}

const fmt = (n: number) =>
  n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
const fmt2 = (n: number) =>
  n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 })

export default function PayeCalculator() {
  const [gross, setGross] = useState(80_000)
  const [kiwiSaver, setKiwiSaver] = useState<number>(3.5)
  const [hasStudentLoan, setHasStudentLoan] = useState(false)

  const valid = Number.isFinite(gross) && gross >= 0
  const incomeTax = valid ? calcIncomeTax(gross) : 0
  const accLevy = valid ? Math.min(gross, ACC_LEVY_CAP_INCOME) * ACC_LEVY_RATE : 0
  const studentLoan =
    valid && hasStudentLoan ? Math.max(0, gross - STUDENT_LOAN_THRESHOLD_ANNUAL) * STUDENT_LOAN_RATE : 0
  const kiwiSaverAmount = valid ? gross * (kiwiSaver / 100) : 0
  const takeHomeAnnual = Math.max(0, gross - incomeTax - accLevy - studentLoan - kiwiSaverAmount)
  const effectiveTaxRate = valid && gross > 0 ? ((incomeTax + accLevy + studentLoan) / gross) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Field label="Gross annual income (NZD)">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={1000}
          className="input-dark"
          value={Number.isFinite(gross) ? gross : ''}
          onChange={e => setGross(Number(e.target.value))}
        />
      </Field>
      <Field label="KiwiSaver employee contribution">
        <select className="input-dark" value={kiwiSaver} onChange={e => setKiwiSaver(Number(e.target.value))}>
          {KIWISAVER_OPTIONS.map(o => (
            <option key={o} value={o}>
              {o === 0 ? 'None' : `${o}%`}
            </option>
          ))}
        </select>
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontSize: 14, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={hasStudentLoan}
          onChange={e => setHasStudentLoan(e.target.checked)}
          style={{ accentColor: '#36F4A4', width: 16, height: 16 }}
        />
        I have a student loan
      </label>

      {valid && (
        <div style={{ marginTop: 12, padding: 24, background: '#061A1C', border: '1px solid #1E2C31', borderRadius: 12 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>Take-home pay</div>
            <div style={{ color: '#36F4A4', fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>
              {fmt2(takeHomeAnnual)}{' '}
              <span style={{ fontSize: 14, color: '#A1A1AA', fontWeight: 400 }}>/ year</span>
            </div>
            <div style={{ color: '#D4D4D8', fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
              {fmt2(takeHomeAnnual / 12)} / month · {fmt2(takeHomeAnnual / 26)} / fortnight · {fmt2(takeHomeAnnual / 52)} / week
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1E2C31', paddingTop: 12 }}>
            <Row label="Gross income" value={fmt(gross)} />
            <Row label="− Income tax (PAYE)" value={fmt(incomeTax)} />
            <Row label="− ACC earner levy" value={fmt(accLevy)} />
            {hasStudentLoan && <Row label="− Student loan" value={fmt(studentLoan)} />}
            {kiwiSaver > 0 && <Row label={`− KiwiSaver (${kiwiSaver}%)`} value={fmt(kiwiSaverAmount)} />}
            <Row label="= Take-home" value={fmt(takeHomeAnnual)} bold />
          </div>

          {gross > 0 && (
            <div style={{ marginTop: 14, color: '#71717A', fontSize: 13 }}>
              Effective tax rate (excludes KiwiSaver): {effectiveTaxRate.toFixed(1)}%
            </div>
          )}
        </div>
      )}

      <p style={{ color: '#71717A', fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
        Based on IRD FY 2026/27 rates (M tax code, primary employment). Excludes Independent Earner Tax Credit (IETC), Working for Families, secondary jobs, schedular/withholding payment codes, and tailored tax codes.
      </p>
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

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: bold ? '1px solid #1E2C31' : 'none', marginTop: bold ? 6 : 0, paddingTop: bold ? 12 : 6 }}>
      <span style={{ color: bold ? '#fff' : '#A1A1AA', fontSize: 14, fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: bold ? 16 : 15, fontWeight: bold ? 600 : 500 }}>{value}</span>
    </div>
  )
}
