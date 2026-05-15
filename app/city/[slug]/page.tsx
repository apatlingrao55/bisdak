export const revalidate = 600

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import BusinessCard from '@/components/BusinessCard'
import { db } from '@/lib/db'
import { regions, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getBusinessCards } from '@/lib/db/queries'
import { SITE_BASE, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

const REGION_BLURB: Record<string, string> = {
  auckland:
    "Auckland is home to the largest Filipino community in Aotearoa — over half of New Zealand&apos;s Filipinos live in the wider Auckland region, from Albany to Manukau, Papatoetoe to West Auckland. That community supports a deep, diverse network of Filipino-owned businesses: full-service restaurants and Filipino fast food in the CBD, bakeshops and remittance shops across the southern suburbs, registered tradies and home-services run by Filipino Kiwis in growth corridors like Karaka and Flat Bush, and a broad mix of professionals — accountants, mortgage brokers, lawyers, healthcare practitioners — many of whom speak Tagalog or Cebuano.",
  wellington:
    "Wellington has a smaller but tight-knit Filipino community spread across the city itself, the Hutt Valley, Porirua, and the Kapiti Coast. Filipino-owned businesses here lean towards bakeshops, catering, and home-services, plus a growing cohort of healthcare professionals working across Wellington Hospital and Hutt Hospital, and Tagalog-speaking accountants and government-sector consultants in the capital.",
  canterbury:
    "Canterbury — Christchurch in particular — hosts a substantial Filipino community that grew significantly after the 2011 earthquakes, when many Filipinos came to NZ to help with the rebuild. Today you&apos;ll find Filipino-owned cafes and restaurants in Riccarton and Linwood, registered tradies across Selwyn and Waimakariri, healthcare workers in every major hospital, and a busy schedule of community basketball leagues and church groups.",
  waikato:
    "Hamilton anchors a growing Filipino community across the Waikato — from Cambridge and Te Awamutu to Tokoroa and Taupo. Filipino-owned businesses in the region include carinderias and home-catering operators, dairy-farm contractors employing Filipino workers, remittance agents covering rural towns, and a strong Filipino healthcare presence at Waikato Hospital.",
  'other-nz':
    "Beyond the main centres, Filipinos and Filipino-owned businesses are scattered across every region of Aotearoa — from Northland to Otago, Hawke&apos;s Bay to the West Coast. These listings include orchard contractors, rural healthcare workers, regional remittance agents, and the occasional Filipino restaurant that makes a small NZ town feel a little closer to home.",
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [reg] = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1)
  if (!reg) return { robots: { index: false, follow: false } }
  return {
    title: `Filipino-owned businesses in ${reg.name}`,
    description: `Browse Filipino-owned businesses in ${reg.name}, New Zealand. Free directory of restaurants, services, tradies, and more — listed on BisDak.`,
    alternates: { canonical: `/city/${slug}` },
  }
}

export default async function CityHubPage({ params }: Props) {
  const { slug } = await params
  const [reg] = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1)
  if (!reg) notFound()

  const listings = await getBusinessCards({
    conditions: [eq(businesses.regionId, reg.id)],
    orderBy: 'featured',
  })

  const blurb =
    REGION_BLURB[slug] ??
    `Filipino-owned businesses in ${reg.name}, New Zealand, listed on BisDak.`

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Filipino-owned businesses in ${reg.name}`,
    itemListElement: listings.slice(0, 50).map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_BASE}/business/${b.slug}`,
      name: b.name,
    })),
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: reg.name, url: `/city/${slug}` },
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
                <li style={{ color: '#52525B' }} aria-current="page">{reg.name}</li>
              </ol>
            </nav>
            <p style={{ color: '#36F4A4', fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 12px' }}>
              📍 Region
            </p>
            <h1 style={{ color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 330, lineHeight: 1.1, margin: '0 0 24px' }}>
              Filipino-owned businesses in {reg.name}
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: 17, lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              {blurb}
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) clamp(24px, 5vw, 32px) 80px' }}>
          <p style={{ color: '#A1A1AA', fontSize: 15, margin: '0 0 24px' }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>{listings.length}</span>{' '}
            business{listings.length === 1 ? '' : 'es'} in {reg.name}
          </p>
          {listings.length === 0 ? (
            <p style={{ color: '#52525B' }}>
              No businesses listed in {reg.name} yet.{' '}
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
