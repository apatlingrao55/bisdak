import Nav from '@/components/Nav'
import GstCalculator from './GstCalculator'
import { webApplicationJsonLd, jsonLdScript } from '@/lib/seo'

export const metadata = {
  title: 'GST Calculator',
  description:
    "Add or extract New Zealand's 15% GST in either direction. Free GST calculator for small business owners.",
  alternates: { canonical: '/tools/gst' },
}

const appLd = webApplicationJsonLd({
  name: 'NZ GST Calculator',
  path: '/tools/gst',
  description: "Add or extract New Zealand's 15% GST in either direction.",
  category: 'FinanceApplication',
})

export default function GstPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(appLd)} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            GST calculator
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            New Zealand&apos;s GST rate is 15%. Add it to a price exclusive of GST, or extract it from a price including GST.
          </p>
          <GstCalculator />
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 32, lineHeight: 1.6 }}>
            Estimate only — for invoicing and tax filing, follow IRD&apos;s official guidance for GST-registered businesses.
          </p>
        </article>
      </div>
    </main>
  )
}
