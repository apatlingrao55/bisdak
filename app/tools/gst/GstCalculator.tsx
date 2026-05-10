'use client'
import { useState } from 'react'

const GST_RATE = 0.15

const fmt = (n: number) =>
  n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 })

type Mode = 'add' | 'extract'

export default function GstCalculator() {
  const [mode, setMode] = useState<Mode>('add')
  const [amount, setAmount] = useState(100)

  const valid = Number.isFinite(amount) && amount >= 0
  const gst = valid ? (mode === 'add' ? amount * GST_RATE : (amount * 3) / 23) : 0
  const other = valid ? (mode === 'add' ? amount + gst : amount - gst) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div role="radiogroup" aria-label="Mode" style={{ display: 'flex', gap: 10 }}>
        <ModeButton active={mode === 'add'} onClick={() => setMode('add')}>
          Add GST
        </ModeButton>
        <ModeButton active={mode === 'extract'} onClick={() => setMode('extract')}>
          Extract GST
        </ModeButton>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
          Amount {mode === 'add' ? 'excluding' : 'including'} GST (NZD)
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          className="input-dark"
          value={Number.isFinite(amount) ? amount : ''}
          onChange={e => setAmount(Number(e.target.value))}
        />
      </label>

      {valid && (
        <div style={{ marginTop: 12, padding: 24, background: '#061A1C', border: '1px solid #1E2C31', borderRadius: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>GST (15%)</div>
            <div style={{ color: '#36F4A4', fontSize: 28, fontWeight: 600 }}>{fmt(gst)}</div>
          </div>
          <div style={{ borderTop: '1px solid #1E2C31', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
              {mode === 'add' ? 'Total including GST' : 'Amount excluding GST'}
            </span>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{fmt(other)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 16px',
        borderRadius: 9999,
        background: active ? '#36F4A4' : 'transparent',
        color: active ? '#000' : '#fff',
        border: `1px solid ${active ? '#36F4A4' : '#3F3F46'}`,
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
