export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import StarRating from '@/components/StarRating'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/lib/db/queries'

const BASE = 'https://bisdak.co.nz'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const biz = await getBusinessBySlug(slug)
  if (!biz) return {}
  const title = `${biz.name} — ${biz.categoryName ?? 'Filipino Business'} in ${biz.regionName ?? 'New Zealand'}`
  const description = biz.description
    ? `${biz.description} · Filipino-owned business in ${biz.regionName ?? 'NZ'} listed on BisDak.`
    : `${biz.name} is a Filipino-owned business in ${biz.regionName ?? 'New Zealand'}. Find contact details and reviews on BisDak.`
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/business/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE}/business/${slug}`,
      type: 'website',
      ...(biz.photoUrl ? { images: [{ url: biz.photoUrl, alt: biz.name }] } : {}),
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function BusinessPage({ params }: { params: Params }) {
  const { slug } = await params
  const biz = await getBusinessBySlug(slug)

  if (!biz) notFound()

  const bizReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.businessId, biz.id))
    .orderBy(reviews.createdAt)

  const avgRating = bizReviews.length > 0
    ? bizReviews.reduce((sum, r) => sum + r.rating, 0) / bizReviews.length
    : 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: biz.name,
    description: biz.description ?? undefined,
    url: biz.website ?? `${BASE}/business/${biz.slug}`,
    telephone: biz.phone ?? undefined,
    ...(biz.regionName ? { address: { '@type': 'PostalAddress', addressRegion: biz.regionName, addressCountry: 'NZ' } } : {}),
    ...(avgRating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating.toFixed(1),
        reviewCount: bizReviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    ...(biz.photoUrl ? { image: biz.photoUrl } : {}),
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>

        {/* Business hero */}
        <section style={{ background: '#061A1C', padding: '48px 24px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {biz.categoryName && (
                    <span style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: '9999px', padding: '4px 12px', fontSize: '13px' }}>
                      {biz.categoryName}
                    </span>
                  )}
                  {biz.regionName && (
                    <span style={{ color: '#A1A1AA', fontSize: '13px' }}>📍 {biz.regionName}</span>
                  )}
                  {biz.isFilipino && (
                    <span style={{ background: 'rgba(54,244,164,0.12)', color: '#36F4A4', border: '1px solid rgba(54,244,164,0.25)', borderRadius: '9999px', padding: '4px 12px', fontSize: '13px', fontWeight: 600 }}>
                      🇵🇭 Filipino-owned
                    </span>
                  )}
                </div>
                <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 330, margin: '0 0 16px', lineHeight: 1.1 }}>
                  {biz.name}
                </h1>
                {biz.description && (
                  <p style={{ color: '#A1A1AA', fontSize: '18px', lineHeight: 1.6, margin: 0, maxWidth: '640px' }}>
                    {biz.description}
                  </p>
                )}
              </div>
              {biz.openStatus && (
                <span style={{ color: biz.openStatus === 'open' ? '#36F4A4' : '#71717A', fontWeight: 600, fontSize: '15px', flexShrink: 0 }}>
                  ● {biz.openStatus === 'open' ? 'Open now' : 'Closed'}
                </span>
              )}
            </div>

            {/* Contact links */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap' }}>
              {biz.phone && (
                <a href={`tel:${biz.phone}`} className="btn-primary" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  📞 {biz.phone}
                </a>
              )}
              {biz.website && (
                <a href={biz.website} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  🌐 Website
                </a>
              )}
              {biz.email && (
                <a href={`mailto:${biz.email}`} className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  ✉️ {biz.email}
                </a>
              )}
              {biz.facebookUrl && (
                <a href={biz.facebookUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  📘 Facebook
                </a>
              )}
              {biz.googleMapsUrl && (
                <a href={biz.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  📍 Google Maps
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Reviews section */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: 0 }}>Reviews</h2>
            {bizReviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StarRating rating={Math.round(avgRating)} />
                <span style={{ color: '#A1A1AA', fontSize: '16px' }}>
                  {avgRating.toFixed(1)} ({bizReviews.length} review{bizReviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* Write a review */}
          <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '28px', marginBottom: '40px' }} className="shadow-card">
            <h3 style={{ color: '#ffffff', fontSize: '18px', margin: '0 0 20px', fontWeight: 500 }}>Write a Review</h3>
            <form action="/api/reviews" method="POST">
              <input type="hidden" name="businessId" value={biz.id} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Your Name *</label>
                  <input type="text" name="reviewerName" required maxLength={100} placeholder="Maria Santos" className="input-dark" />
                </div>
                <div>
                  <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Suburb *</label>
                  <input type="text" name="suburb" required maxLength={100} placeholder="Manukau" className="input-dark" />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Rating *</label>
                <select name="rating" required className="input-dark">
                  <option value="">Select rating</option>
                  <option value="5">★★★★★ Excellent</option>
                  <option value="4">★★★★ Good</option>
                  <option value="3">★★★ Average</option>
                  <option value="2">★★ Poor</option>
                  <option value="1">★ Terrible</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Review (max 300 chars) *</label>
                <textarea
                  name="body"
                  required
                  maxLength={300}
                  rows={3}
                  placeholder="Share your experience..."
                  className="input-dark"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn-primary">Submit Review</button>
            </form>
          </div>

          {/* Review list */}
          {bizReviews.length === 0 ? (
            <p style={{ color: '#52525B', textAlign: 'center', padding: '40px 0', fontSize: '16px' }}>
              No reviews yet. Be the first to review!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bizReviews.map(review => (
                <div
                  key={review.id}
                  style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px' }}
                  className="shadow-card"
                >
                  {review.isFlagged && (
                    <p style={{ color: '#71717A', fontSize: '13px', margin: '0 0 10px', padding: '8px 12px', background: 'rgba(113,113,122,0.1)', borderRadius: '6px' }}>
                      ⚠️ Flagged for moderation
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '15px' }}>{review.reviewerName}</span>
                      <span style={{ color: '#71717A', fontSize: '14px', marginLeft: '8px' }}>{review.suburb}</span>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: 1.6, margin: '0 0 14px' }}>
                    {review.body}
                  </p>
                  {review.ownerResponse && (
                    <div style={{ background: '#061A1C', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', borderLeft: '3px solid #1E2C31' }}>
                      <p style={{ color: '#71717A', fontSize: '12px', margin: '0 0 4px', fontWeight: 600, letterSpacing: '0.5px' }}>OWNER RESPONSE</p>
                      <p style={{ color: '#A1A1AA', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>{review.ownerResponse}</p>
                    </div>
                  )}
                  <form action={`/api/reviews/${review.id}/flag`} method="POST" style={{ display: 'inline' }}>
                    <button type="submit" style={{ background: 'none', border: 'none', color: '#52525B', fontSize: '13px', cursor: 'pointer', padding: 0, transition: 'color 150ms ease' }}>
                      🚩 Flag as inappropriate
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
