export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { businesses, reviews, categories, regions, businessClaims } from '@/lib/db/schema'
import { eq, inArray, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { listJobsForOwner } from '@/lib/jobs/queries'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/sign-in')

  const userId = session.user.id

  const myBusinesses = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      status: businesses.status,
      categoryName: categories.name,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(eq(businesses.ownerId, userId))

  // Pending claims for this user
  const pendingClaims = await db
    .select({
      id: businessClaims.id,
      businessName: businesses.name,
      status: businessClaims.status,
    })
    .from(businessClaims)
    .innerJoin(businesses, eq(businessClaims.businessId, businesses.id))
    .where(and(eq(businessClaims.userId, userId), eq(businessClaims.status, 'pending')))

  const myJobs = await listJobsForOwner(userId)
  const openJobsCount = myJobs.filter(
    j => j.status === 'open' && !j.closedAt && new Date(j.expiresAt) > new Date(),
  ).length

  const bizIds = myBusinesses.map(b => b.id)

  const myReviews = bizIds.length > 0
    ? await db
        .select()
        .from(reviews)
        .where(inArray(reviews.businessId, bizIds))
        .orderBy(reviews.createdAt)
    : []

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '56px 24px' }}>

          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 8px' }}>
              Dashboard
            </h1>
            <p style={{ color: '#A1A1AA', margin: 0, fontSize: '17px' }}>
              Welcome back, {session.user.name ?? session.user.email}
            </p>
          </div>

          {/* Pending Claims */}
          {pendingClaims.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 400, margin: '0 0 16px' }}>Pending Claims</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingClaims.map(claim => (
                  <div
                    key={claim.id}
                    style={{
                      background: 'rgba(54,244,164,0.05)',
                      border: '1px solid rgba(54,244,164,0.2)',
                      borderRadius: '10px',
                      padding: '14px 20px',
                      color: '#A1A1AA',
                      fontSize: '15px',
                    }}
                  >
                    Your claim for <span style={{ color: '#ffffff', fontWeight: 600 }}>{claim.businessName}</span> is pending admin review.
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Jobs */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 400, margin: '0 0 16px' }}>Jobs</h2>
            <Link
              href="/dashboard/jobs"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(54,244,164,0.05)',
                border: '1px solid rgba(54,244,164,0.2)',
                borderRadius: '10px',
                padding: '14px 20px',
                color: '#ffffff',
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              <span>Manage your job listings</span>
              <span style={{ color: '#36F4A4' }}>{openJobsCount} open →</span>
            </Link>
          </section>

          {/* Listings */}
          <section style={{ marginBottom: '56px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: 0 }}>Your Listings</h2>
              <a href="/submit" className="btn-primary" style={{ padding: '8px 20px', fontSize: '15px' }}>
                + Add Listing
              </a>
            </div>

            {myBusinesses.length === 0 ? (
              <div style={{
                background: '#02090A',
                border: '1px solid #1E2C31',
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center',
              }} className="shadow-card">
                <p style={{ color: '#A1A1AA', margin: '0 0 20px', fontSize: '16px' }}>
                  You haven&apos;t claimed or added any listings yet.
                </p>
                <a href="/submit" className="btn-primary">Submit a Business</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myBusinesses.map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: '#02090A',
                      border: '1px solid #1E2C31',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                    className="shadow-card"
                  >
                    <div>
                      <h3 style={{ color: '#ffffff', margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>{b.name}</h3>
                      <p style={{ color: '#71717A', margin: 0, fontSize: '14px' }}>
                        {b.categoryName} · {b.regionName} ·{' '}
                        <span style={{ color: b.status === 'active' ? '#36F4A4' : '#71717A', fontWeight: 600 }}>
                          {b.status}
                        </span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={`/dashboard/edit/${b.slug}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                        Edit
                      </a>
                      <a href={`/business/${b.slug}`} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '14px' }}>
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reviews */}
          {myReviews.length > 0 && (
            <section>
              <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: '0 0 24px' }}>
                Reviews on Your Listings
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myReviews.slice(0, 20).map(r => (
                  <div
                    key={r.id}
                    style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px' }}
                    className="shadow-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>
                        {r.reviewerName}
                        <span style={{ color: '#71717A', fontWeight: 400, marginLeft: '8px' }}>from {r.suburb}</span>
                      </span>
                      <span style={{ color: '#36F4A4', fontSize: '14px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p style={{ color: '#A1A1AA', margin: '0 0 14px', fontSize: '15px', lineHeight: 1.5 }}>{r.body}</p>

                    {r.ownerResponse ? (
                      <div style={{ background: '#061A1C', borderRadius: '8px', padding: '10px 14px', borderLeft: '3px solid #1E2C31' }}>
                        <p style={{ color: '#71717A', fontSize: '12px', margin: '0 0 4px', fontWeight: 600 }}>YOUR RESPONSE</p>
                        <p style={{ color: '#A1A1AA', fontSize: '14px', margin: 0 }}>{r.ownerResponse}</p>
                      </div>
                    ) : (
                      <form action={`/api/reviews/${r.id}/respond`} method="POST" style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          name="response"
                          placeholder="Write a response to this review..."
                          className="input-dark"
                          style={{ flex: 1, fontSize: '14px' }}
                          required
                        />
                        <button type="submit" className="btn-primary" style={{ padding: '0 16px', fontSize: '14px', whiteSpace: 'nowrap', height: '44px' }}>
                          Respond
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
