import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { submissions, reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type SearchParams = Promise<{ token?: string }>

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const token = params.token ?? ''

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return (
      <main>
        <Nav />
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#71717A', fontSize: '16px', margin: '0 0 16px' }}>Admin access requires a valid token.</p>
            <p style={{ color: '#52525B', fontSize: '14px' }}>
              Access: <code style={{ color: '#36F4A4' }}>/admin?token=YOUR_ADMIN_TOKEN</code>
            </p>
          </div>
        </div>
      </main>
    )
  }

  const pendingSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, 'pending'))
    .orderBy(submissions.createdAt)

  const flaggedReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.isFlagged, true))
    .orderBy(reviews.createdAt)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '56px 24px' }}>

          <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 8px' }}>
            Admin Panel
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 56px', fontSize: '16px' }}>
            Moderation queue · Token authenticated
          </p>

          {/* Pending submissions */}
          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: '0 0 24px' }}>
              Pending Submissions ({pendingSubmissions.length})
            </h2>
            {pendingSubmissions.length === 0 ? (
              <p style={{ color: '#52525B', fontSize: '15px' }}>No pending submissions. All clear!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingSubmissions.map(sub => (
                  <div
                    key={sub.id}
                    style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px 24px' }}
                    className="shadow-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '18px', fontWeight: 600 }}>{sub.name}</h3>
                        <p style={{ color: '#71717A', margin: '0 0 8px', fontSize: '13px' }}>
                          {[sub.phone, sub.website, sub.submitterEmail].filter(Boolean).join(' · ')}
                        </p>
                        {sub.description && (
                          <p style={{ color: '#A1A1AA', margin: 0, fontSize: '15px', lineHeight: 1.5 }}>{sub.description}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <form action={`/api/admin/submissions/${sub.id}`} method="POST">
                          <input type="hidden" name="status" value="approved" />
                          <input type="hidden" name="token" value={token} />
                          <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                            ✓ Approve
                          </button>
                        </form>
                        <form action={`/api/admin/submissions/${sub.id}`} method="POST">
                          <input type="hidden" name="status" value="rejected" />
                          <input type="hidden" name="token" value={token} />
                          <button
                            type="submit"
                            style={{
                              background: 'transparent',
                              color: '#71717A',
                              border: '1px solid #3F3F46',
                              borderRadius: '9999px',
                              padding: '8px 16px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              transition: 'all 200ms ease',
                            }}
                          >
                            ✕ Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Flagged reviews */}
          <section>
            <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: '0 0 24px' }}>
              Flagged Reviews ({flaggedReviews.length})
            </h2>
            {flaggedReviews.length === 0 ? (
              <p style={{ color: '#52525B', fontSize: '15px' }}>No flagged reviews.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {flaggedReviews.map(r => (
                  <div
                    key={r.id}
                    style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px 24px' }}
                    className="shadow-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>
                        {r.reviewerName}
                        <span style={{ color: '#71717A', fontWeight: 400, marginLeft: '8px' }}>from {r.suburb}</span>
                      </span>
                      <span style={{ color: '#A1A1AA', fontSize: '14px' }}>
                        {'★'.repeat(r.rating)} · Business: {r.businessId.slice(0, 8)}...
                      </span>
                    </div>
                    <p style={{ color: '#A1A1AA', margin: 0, fontSize: '15px', lineHeight: 1.5 }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
