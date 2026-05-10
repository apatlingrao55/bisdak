'use client'
import { useState } from 'react'

type Direction = 'nzd-to-php' | 'php-to-nzd'

const fmt = (n: number) =>
  n.toLocaleString('en-NZ', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

const fmtRate = (n: number) =>
  n.toLocaleString('en-NZ', { maximumFractionDigits: 4 })

export default function CurrencyConverter({ rate }: { rate: number }) {
  const [direction, setDirection] = useState<Direction>('nzd-to-php')
  const [amount, setAmount] = useState(100)

  const fromCurrency = direction === 'nzd-to-php' ? 'NZD' : 'PHP'
  const toCurrency = direction === 'nzd-to-php' ? 'PHP' : 'NZD'
  const valid = Number.isFinite(amount) && amount >= 0
  const result = valid ? (direction === 'nzd-to-php' ? amount * rate : amount / rate) : 0

  const swap = () => setDirection(d => (d === 'nzd-to-php' ? 'php-to-nzd' : 'nzd-to-php'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          textAlign: 'center',
          padding: '12px 16px',
          background: '#061A1C',
          border: '1px solid #1E2C31',
          borderRadius: 12,
          color: '#36F4A4',
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        1 NZD = {fmtRate(rate)} PHP
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
          Amount in {fromCurrency}
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

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={swap}
          className="btn-ghost"
          style={{ padding: '8px 18px', fontSize: 14 }}
          aria-label={`Swap to ${toCurrency} → ${fromCurrency}`}
        >
          ↕ Swap direction
        </button>
      </div>

      {valid && (
        <div style={{ padding: 24, background: '#061A1C', border: '1px solid #1E2C31', borderRadius: 12 }}>
          <div style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 4 }}>
            {fmt(amount)} {fromCurrency} =
          </div>
          <div style={{ color: '#36F4A4', fontSize: 32, fontWeight: 600, lineHeight: 1.2 }}>
            {fmt(result)}{' '}
            <span style={{ fontSize: 16, color: '#A1A1AA', fontWeight: 400 }}>{toCurrency}</span>
          </div>
        </div>
      )}
    </div>
  )
}
