export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import StarRating from '@/components/StarRating'
import ShareButton from '@/components/ShareButton'
import ClaimButton from '@/components/ClaimButton'
import { db } from '@/lib/db'
import { reviews, businessClaims } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/lib/db/queries'
import { auth } from '@/auth'
import { getCategoryColor } from '@/lib/category-color'
import { extractMapsQuery } from '@/lib/maps'

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
      images: [{ url: `${BASE}/api/og/${slug}`, width: 1200, height: 630, alt: biz.name }],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function BusinessPage({ params }: { params: Params }) {
  const { slug } = await params
  const biz = await getBusinessBySlug(slug)

  if (!biz) notFound()

  const session = await auth()
  const userId = session?.user?.id

  // Check if user can claim this business
  let canClaim = false
  let hasPendingClaim = false
  if (userId && !biz.ownerId) {
    const [existing] = await db
      .select({ id: businessClaims.id, status: businessClaims.status })
      .from(businessClaims)
      .where(and(
        eq(businessClaims.userId, userId),
        eq(businessClaims.businessId, biz.id),
      ))
      .limit(1)
    if (existing) {
      hasPendingClaim = existing.status === 'pending'
    } else {
      canClaim = true
    }
  }

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

  const mapsQuery = biz.googleMapsUrl ? extractMapsQuery(biz.googleMapsUrl) : null
  const mapsEmbedQuery = mapsQuery ?? (biz.name + (biz.regionName ? `, ${biz.regionName}, New Zealand` : ', New Zealand'))

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      {/* ── Section 1: Hero Banner ── */}
      <section style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(300px, 50vw, 440px)',
        overflow: 'hidden',
        background: biz.photoUrl ? '#1E2C31' : getCategoryColor(biz.categoryName),
        marginTop: '64px',
      }}>
        {biz.photoUrl ? (
          <img
            src={biz.photoUrl}
            alt={biz.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(80px, 15vw, 140px)', opacity: 0.3,
          }}>
            {biz.categoryIcon ?? '🏢'}
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '70%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
          pointerEvents: 'none',
        }} />
        {/* Overlaid content */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: 'clamp(24px, 4vw, 48px) clamp(24px, 5vw, 64px)',
        }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {biz.categoryName && (
              <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#ffffff', borderRadius: '9999px', padding: '4px 14px', fontSize: '13px' }}>
                {biz.categoryName}
              </span>
            )}
            {biz.regionName && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>📍 {biz.regionName}</span>
            )}
            {biz.isPremium && (
              <span style={{ background: 'rgba(251,191,36,0.2)', backdropFilter: 'blur(4px)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '9999px', padding: '4px 14px', fontSize: '13px', fontWeight: 600 }}>
                ★ Featured
              </span>
            )}
            {biz.isFilipino && (
              <span style={{ background: 'rgba(54,244,164,0.15)', backdropFilter: 'blur(4px)', color: '#36F4A4', border: '1px solid rgba(54,244,164,0.25)', borderRadius: '9999px', padding: '4px 14px', fontSize: '13px', fontWeight: 600 }}>
                🇵🇭 Filipino-owned
              </span>
            )}
            {biz.openStatus && (
              <span style={{ color: biz.openStatus === 'open' ? '#36F4A4' : '#71717A', fontWeight: 600, fontSize: '14px' }}>
                ● {biz.openStatus === 'open' ? 'Open now' : 'Closed'}
              </span>
            )}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 300, margin: 0, lineHeight: 1.1, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {biz.name}
          </h1>
          {bizReviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <StarRating rating={Math.round(avgRating)} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>
                {avgRating.toFixed(1)} ({bizReviews.length} review{bizReviews.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: About ── */}
      {biz.description && (
        <section style={{ background: '#02090A', padding: 'clamp(40px, 6vw, 72px) clamp(24px, 5vw, 64px)', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ color: '#D4D4D8', fontSize: 'clamp(18px, 2.5vw, 22px)', lineHeight: 1.8, margin: 0 }}>
              {biz.description}
            </p>
          </div>
        </section>
      )}

      {/* ── Section 3: Contact Strip ── */}
      <section style={{ background: '#061A1C', padding: 'clamp(28px, 4vw, 48px) clamp(24px, 5vw, 64px)', borderBottom: '1px solid #1E2C31' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px', margin: '0 auto' }}>
          {biz.phone && (
            <a href={`tel:${biz.phone}`} className="btn-primary" style={{ fontSize: '16px', padding: '14px 28px' }}>
              📞 {biz.phone}
            </a>
          )}
          {biz.website && (
            <a href={biz.website} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '16px', padding: '14px 28px' }}>
              🌐 Website
            </a>
          )}
          {biz.email && (
            <a href={`mailto:${biz.email}`} className="btn-ghost" style={{ fontSize: '16px', padding: '14px 28px' }}>
              ✉️ Email
            </a>
          )}
          {biz.facebookUrl && (
            <a href={biz.facebookUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '16px', padding: '14px 28px' }}>
              📘 Facebook
            </a>
          )}
          {biz.googleMapsUrl && (
            <a href={biz.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '16px', padding: '14px 28px' }}>
              📍 Get Directions
            </a>
          )}
          <ShareButton slug={biz.slug} name={biz.name} />
          {canClaim && <ClaimButton businessId={biz.id} />}
          {hasPendingClaim && (
            <span style={{
              background: 'rgba(54,244,164,0.08)',
              color: '#36F4A4',
              borderRadius: '9999px',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: 500,
            }}>
              Claim pending review
            </span>
          )}
        </div>
      </section>

      {/* ── Section 4: Embedded Map ── */}
      {biz.googleMapsUrl && (
        <section style={{ width: '100%', height: 'clamp(280px, 40vw, 400px)', borderBottom: '1px solid #1E2C31' }}>
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapsEmbedQuery)}&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map showing ${biz.name}`}
          />
        </section>
      )}

      {/* ── Section 5: Reviews ── */}
      <section style={{ background: '#000000', padding: 'clamp(40px, 6vw, 72px) clamp(24px, 5vw, 64px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
          {(() => {
            const canReview = !!(userId && session?.user?.emailVerified)
            return (
              <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '28px', marginBottom: '40px', opacity: canReview ? 1 : 0.5 }} className="shadow-card">
                <h3 style={{ color: '#ffffff', fontSize: '18px', margin: '0 0 20px', fontWeight: 500 }}>Write a Review</h3>
                {!canReview && (
                  <p style={{ color: '#F59E0B', fontSize: '14px', margin: '0 0 16px', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: '6px' }}>
                    {!userId
                      ? <><a href={`/auth/sign-in?callbackUrl=/business/${biz.slug}`} style={{ color: '#36F4A4', textDecoration: 'none' }}>Sign in</a> with a verified email to leave a review.</>
                      : <>Please <a href={`/auth/verify?email=${encodeURIComponent(session?.user?.email ?? '')}`} style={{ color: '#36F4A4', textDecoration: 'none' }}>verify your email</a> to leave a review.</>
                    }
                  </p>
                )}
                <fieldset disabled={!canReview} style={{ border: 'none', padding: 0, margin: 0 }}>
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
                </fieldset>
              </div>
            )
          })()}

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
        </div>
      </section>
    </main>
  )
}
