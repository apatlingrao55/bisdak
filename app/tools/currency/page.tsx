import Nav from '@/components/Nav'
import { getNzdToPhpRate } from '@/lib/tools/currency'
import CurrencyConverter from './CurrencyConverter'
import { webApplicationJsonLd, jsonLdScript } from '@/lib/seo'

export const metadata = {
  title: 'NZD ↔ PHP Currency Converter',
  description:
    'Convert New Zealand dollars to Philippine pesos and back at the latest exchange rate. Free currency converter from BisDak.',
  alternates: { canonical: '/tools/currency' },
}

const appLd = webApplicationJsonLd({
  name: 'NZD ↔ PHP Currency Converter',
  path: '/tools/currency',
  description:
    "Convert between New Zealand dollars and Philippine pesos at today's exchange rate.",
  category: 'FinanceApplication',
})

export default async function CurrencyPage() {
  const { rate, asOf, source, stale } = await getNzdToPhpRate()

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(appLd)} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            NZD ↔ PHP currency converter
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            Convert between New Zealand dollars and Philippine pesos at today&apos;s exchange rate.
          </p>

          <CurrencyConverter rate={rate} />

          <p style={{ color: stale ? '#FBBF24' : '#71717A', fontSize: 13, marginTop: 24, lineHeight: 1.6 }}>
            Rate from {source}
            {asOf ? <> as of {asOf}</> : null}
            {stale ? ' — may be out of date.' : '.'}
          </p>
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Live mid-market rate, refreshed every 5 minutes. Banks and remittance providers will charge a margin and fees on top — actual amount received will be lower.
          </p>
        </article>
      </div>
    </main>
  )
}
