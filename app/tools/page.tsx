import Nav from '@/components/Nav'
import Link from 'next/link'

export const metadata = {
  title: 'Tools',
  description:
    'Free calculators and quick references for the Filipino community in New Zealand: mortgage, PAYE / take-home pay, GST, NZD ↔ PHP currency, Manila ↔ NZ time zone.',
}

const TOOLS = [
  {
    slug: 'mortgage',
    icon: '🏡',
    title: 'Mortgage calculator',
    desc: 'Estimate weekly, fortnightly, or monthly home loan repayments in New Zealand.',
  },
  {
    slug: 'paye',
    icon: '💼',
    title: 'PAYE / take-home pay',
    desc: 'See your take-home pay after tax, ACC, KiwiSaver, and student loan deductions.',
  },
  {
    slug: 'gst',
    icon: '🧾',
    title: 'GST calculator',
    desc: "Add or extract New Zealand's 15% GST in either direction.",
  },
  {
    slug: 'currency',
    icon: '💱',
    title: 'NZD ↔ PHP currency',
    desc: "Convert between New Zealand dollars and Philippine pesos at today's rate.",
  },
  {
    slug: 'time-zone',
    icon: '🕐',
    title: 'Manila ↔ NZ time zone',
    desc: 'See what time it is in the Philippines and New Zealand right now.',
  },
] as const

export default function ToolsPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px' }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Free tools for Pinoy Kiwis
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: 18, margin: '0 0 48px', lineHeight: 1.6 }}>
            Calculators and quick references for life in New Zealand.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 20 }}>
            {TOOLS.map(t => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#061A1C',
                  border: '1px solid #1E2C31',
                  borderRadius: 12,
                  padding: 24,
                  textDecoration: 'none',
                  transition: 'border-color 200ms ease, background 200ms ease',
                }}
                className="shadow-card"
              >
                <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 14 }} aria-hidden="true">
                  {t.icon}
                </div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t.title}</div>
                <div style={{ color: '#A1A1AA', fontSize: 14, lineHeight: 1.6, marginBottom: 16, flex: 1 }}>{t.desc}</div>
                <div style={{ color: '#36F4A4', fontSize: 14, fontWeight: 500 }}>Open →</div>
              </Link>
            ))}
          </div>

          <p style={{ color: '#71717A', fontSize: 13, marginTop: 56, textAlign: 'center', lineHeight: 1.6 }}>
            All tools are estimates only. For financial, legal, or tax decisions, please confirm with a qualified professional.
          </p>
        </div>
      </div>
    </main>
  )
}
