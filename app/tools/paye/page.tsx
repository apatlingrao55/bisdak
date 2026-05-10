import Nav from '@/components/Nav'
import PayeCalculator from './PayeCalculator'

export const metadata = {
  title: 'PAYE / Take-Home Calculator',
  description:
    'Estimate your New Zealand take-home pay after PAYE income tax, ACC earner levy, KiwiSaver, and student loan deductions.',
}

export default function PayePage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            PAYE / take-home calculator
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            See your annual, monthly, fortnightly, and weekly take-home pay after tax, ACC, KiwiSaver, and student loan.
          </p>
          <PayeCalculator />
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 32, lineHeight: 1.6 }}>
            Estimate only — not financial or tax advice. Use IRD&apos;s official calculators or speak to a tax professional for binding figures.
          </p>
        </article>
      </div>
    </main>
  )
}
