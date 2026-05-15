export const revalidate = 600

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import BusinessCard from '@/components/BusinessCard'
import { db } from '@/lib/db'
import { categories, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getBusinessCards } from '@/lib/db/queries'
import { SITE_BASE, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

const CATEGORY_BLURB: Record<string, string> = {
  'food-dining':
    "From carinderias and lechon manok joints to bakeshops, full-service restaurants, food trucks, and home-based catering — Food & Dining is the heart of the Kiwi-Filipino directory. These businesses bring adobo, sinigang, lumpia, pancit, lechon kawali, and pan de sal to towns across Aotearoa, plus modern fusion spots run by second-generation owners.",
  'professional-services':
    "Accountants, mortgage brokers, lawyers, IT consultants, real estate agents, and other professional services run by Filipino Kiwis. Many speak Tagalog, Cebuano, or Ilocano, which makes navigating NZ paperwork — visa applications, tax returns, KiwiSaver, business setup — significantly easier for kababayan who would rather not switch into English-only mode for serious life admin.",
  'health-wellness':
    "GPs, dentists, physiotherapists, midwives, mental-health professionals, and other health-and-wellness practitioners with Filipino backgrounds. NZ has one of the largest Filipino healthcare workforces in the OECD — many of these clinicians offer cultural-context care that matters for diaspora patients managing chronic conditions, prenatal care, or family mental health.",
  'trades-home-services':
    "Builders, electricians, plumbers, painters, roofers, gardeners, cleaners, and other tradies. Filipinos run a growing share of NZ's residential trades, especially in Auckland and the Waikato — and a Filipino tradie who&apos;ll happily de-shoe at your door and chat about Manny Pacquiao on the job is a small home-renovation joy.",
  'beauty-personal-care':
    "Hair salons, barbers, nail bars, threading and waxing studios, makeup artists, and beauty therapists. Many of these businesses cater to the Filipino preference for affordable, no-fuss services with attention to detail — and often double as community hubs where the latest news from the kababayan grapevine moves faster than any group chat.",
  'remittance-travel':
    "Money transfer agents, balikbayan box couriers, travel agencies specialising in Philippines routings, and visa services. Sending money or boxes home is monthly life for many NZ Filipinos, and these businesses compete hard on rates, fees, and door-to-door delivery — particularly important during typhoon season and the December balikbayan rush.",
  'retail-groceries':
    "Asian grocers stocking Filipino staples (Datu Puti, Mama Sita's, Lucky Me!, Magnolia ice cream, ube halaya, frozen siomai), sari-sari style corner shops, online specialty retailers, and small boutique stores selling Filipino-made clothing, jewellery, and handicrafts.",
  'community-events':
    "Filipino community associations, churches with Tagalog mass, dance groups, charities, event organisers, and sports clubs. These are the connective tissue of NZ&apos;s Filipino diaspora — running fiestas, basketball leagues, Independence Day celebrations, beauty pageants, and disaster-relief drives whenever something hits back home.",
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
  if (!cat) return { robots: { index: false, follow: false } }
  return {
    title: `Filipino ${cat.name} in New Zealand`,
    description: `Browse Filipino-owned ${cat.name.toLowerCase()} businesses across New Zealand on BisDak. Free directory, owner-claim, community reviews.`,
    alternates: { canonical: `/category/${slug}` },
  }
}

export default async function CategoryHubPage({ params }: Props) {
  const { slug } = await params
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
  if (!cat) notFound()

  const listings = await getBusinessCards({
    conditions: [eq(businesses.categoryId, cat.id)],
    orderBy: 'featured',
  })

  const blurb =
    CATEGORY_BLURB[slug] ??
    `Filipino-owned ${cat.name.toLowerCase()} businesses across New Zealand, listed on BisDak.`

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Filipino ${cat.name} in New Zealand`,
    itemListElement: listings.slice(0, 50).map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_BASE}/business/${b.slug}`,
      name: b.name,
    })),
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: cat.name, url: `/category/${slug}` },
  ])

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(itemList)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumb)} />
      <Nav />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <section style={{ background: '#061A1C', padding: 'clamp(48px, 8vw, 80px) clamp(24px, 5vw, 32px)', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
              <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: 0, color: '#71717A', fontSize: 13 }}>
                <li><Link href="/" style={{ color: '#A1A1AA', textDecoration: 'none' }}>Home</Link></li>
                <li aria-hidden="true">›</li>
                <li style={{ color: '#52525B' }} aria-current="page">{cat.name}</li>
              </ol>
            </nav>
            <p style={{ color: '#36F4A4', fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 12px' }}>
              {cat.icon} Category
            </p>
            <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 330, lineHeight: 1.1, margin: '0 0 24px' }}>
              Filipino {cat.name} in New Zealand
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: 17, lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              {blurb}
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) clamp(24px, 5vw, 32px) 80px' }}>
          <p style={{ color: '#A1A1AA', fontSize: 15, margin: '0 0 24px' }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>{listings.length}</span>{' '}
            business{listings.length === 1 ? '' : 'es'} listed
          </p>
          {listings.length === 0 ? (
            <p style={{ color: '#52525B' }}>
              No businesses in this category yet.{' '}
              <Link href="/submit" style={{ color: '#36F4A4', textDecoration: 'none' }}>Submit a listing →</Link>
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
              {listings.map(b => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
