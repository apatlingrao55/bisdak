import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'

export const metadata = {
  title: 'News & Stories — BisDak Pinoy Business Hub NZ',
  description: 'Community news, business spotlights, and stories from the Filipino community in New Zealand.',
}

export default async function BlogPage() {
  const allPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>

        {/* Header */}
        <section style={{ background: '#061A1C', padding: '72px 24px 56px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <p style={{ color: '#36F4A4', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, margin: '0 0 16px' }}>
              Community
            </p>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 330, lineHeight: 1.05, margin: '0 0 16px' }}>
              News & Stories
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: '18px', margin: 0, lineHeight: 1.6 }}>
              Business spotlights, community updates, and stories from the Filipino community across New Zealand.
            </p>
          </div>
        </section>

        {/* Posts list */}
        <section style={{ padding: '64px 24px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            {allPosts.length === 0 ? (
              <p style={{ color: '#52525B', fontSize: '16px' }}>No posts yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {allPosts.map((post, i) => (
                  <article
                    key={post.id}
                    style={{
                      padding: '40px 0',
                      borderBottom: i < allPosts.length - 1 ? '1px solid #1E2C31' : 'none',
                    }}
                  >
                    <p style={{ color: '#52525B', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 12px' }}>
                      {post.authorName} · {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })
                        : ''}
                    </p>
                    <h2 style={{ margin: '0 0 12px' }}>
                      <Link
                        href={`/blog/${post.slug}`}
                        style={{
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontSize: 'clamp(22px, 3vw, 28px)',
                          fontWeight: 400,
                          lineHeight: 1.2,
                          display: 'block',
                        }}
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p style={{ color: '#A1A1AA', fontSize: '17px', lineHeight: 1.6, margin: '0 0 20px', maxWidth: '640px' }}>
                      {post.excerpt}
                    </p>
                    <Link
                      href={`/blog/${post.slug}`}
                      style={{ color: '#36F4A4', fontSize: '15px', textDecoration: 'none', fontWeight: 500 }}
                    >
                      Read more →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer style={{ background: '#000000', padding: '28px 24px', textAlign: 'center', borderTop: '1px solid #1E2C31' }}>
        <p style={{ color: '#52525B', fontSize: '14px', margin: 0 }}>
          © 2026 BisDak Pinoy Business Hub · bisdak.co.nz ·{' '}
          <Link href="/submit" style={{ color: '#71717A', textDecoration: 'none' }}>Submit a Business</Link>
        </p>
      </footer>
    </main>
  )
}
