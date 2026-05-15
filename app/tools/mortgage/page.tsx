import Nav from '@/components/Nav'
import MortgageCalculator from './MortgageCalculator'
import { webApplicationJsonLd, jsonLdScript } from '@/lib/seo'

export const metadata = {
  title: 'Mortgage Calculator',
  description:
    'Estimate your weekly, fortnightly, or monthly home loan repayments in New Zealand. Free mortgage calculator from BisDak.',
  alternates: { canonical: '/tools/mortgage' },
}

const appLd = webApplicationJsonLd({
  name: 'NZ Mortgage Repayment Calculator',
  path: '/tools/mortgage',
  description:
    'Estimate your weekly, fortnightly, or monthly home loan repayments in New Zealand.',
  category: 'FinanceApplication',
})

export default function MortgagePage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(appLd)} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            Mortgage calculator
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            Estimate your weekly, fortnightly, or monthly home loan repayments.
          </p>
          <MortgageCalculator />
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 32, lineHeight: 1.6 }}>
            Estimate only — confirm with a qualified mortgage adviser before making any decisions. Actual bank repayments may differ slightly due to fees, daily interest accrual, and variable rates.
          </p>
        </article>
      </div>
    </main>
  )
}
