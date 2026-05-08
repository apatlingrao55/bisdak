export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { submissions, reviews, posts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

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

  const allPosts = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.publishedAt))

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

          {/* Blog posts */}
          <section style={{ marginBottom: '64px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 400, margin: 0 }}>
                Blog Posts ({allPosts.length})
              </h2>
              <a href="/blog" target="_blank" style={{ color: '#36F4A4', fontSize: '14px', textDecoration: 'none' }}>View blog →</a>
            </div>

            {/* New post form */}
            <form action="/api/admin/posts" method="POST" style={{ marginBottom: '32px' }}>
              <input type="hidden" name="token" value={token} />
              <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: '#36F4A4', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500, margin: 0 }}>New Post</p>
                <input
                  name="title"
                  placeholder="Title"
                  required
                  className="input-dark"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  name="slug"
                  placeholder="slug-url-friendly"
                  required
                  pattern="[a-z0-9-]+"
                  className="input-dark"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  name="excerpt"
                  placeholder="Excerpt (1–2 sentences shown on listing page)"
                  required
                  className="input-dark"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <textarea
                  name="content"
                  placeholder="Content (supports **bold**, *italic*, [link](url), and --- dividers)"
                  required
                  rows={10}
                  className="input-dark"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace', fontSize: '14px' }}
                />
                <input
                  name="authorName"
                  placeholder="Author name (default: BisDak Team)"
                  className="input-dark"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <div>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
                    Publish Post
                  </button>
                </div>
              </div>
            </form>

            {/* Existing posts list */}
            {allPosts.length === 0 ? (
              <p style={{ color: '#52525B', fontSize: '15px' }}>No posts yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allPosts.map(post => (
                  <div key={post.id} style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span style={{ display: 'inline-block', marginRight: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: post.status === 'published' ? 'rgba(54,244,164,0.1)' : 'rgba(113,113,122,0.2)', color: post.status === 'published' ? '#36F4A4' : '#71717A' }}>
                        {post.status}
                      </span>
                      <span style={{ color: '#ffffff', fontWeight: 500, fontSize: '16px' }}>{post.title}</span>
                      <span style={{ color: '#52525B', fontSize: '13px', marginLeft: '12px' }}>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-NZ') : ''}
                      </span>
                    </div>
                    <a href={`/blog/${post.slug}`} target="_blank" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none' }}>
                      View →
                    </a>
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
