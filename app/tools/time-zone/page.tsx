import Nav from '@/components/Nav'
import TimeZoneConverter from './TimeZoneConverter'

export const metadata = {
  title: 'Manila ↔ NZ Time Zone Converter',
  description:
    'See what time it is in the Philippines and New Zealand right now. Convert between Manila and Auckland for calls home.',
}

export default function TimeZonePage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            Manila ↔ NZ time zone
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            Find out what time it is in the Philippines and New Zealand right now. Pick a different moment to plan a call home.
          </p>
          <TimeZoneConverter />
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 32, lineHeight: 1.6 }}>
            New Zealand observes daylight saving (late September to early April); the Philippines does not. Conversions account for this automatically.
          </p>
        </article>
      </div>
    </main>
  )
}
