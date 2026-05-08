export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)
  if (!post) return {}
  return { title: `${post.title} — BisDak`, description: post.excerpt }
}

function renderContent(content: string) {
  return content
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={i} style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, margin: '32px 0 12px' }}>{line.slice(2, -2)}</h3>
      }
      if (line.startsWith('---')) {
        return <hr key={i} style={{ border: 'none', borderTop: '1px solid #1E2C31', margin: '32px 0' }} />
      }
      if (line.trim() === '') {
        return <div key={i} style={{ height: '12px' }} />
      }
      const withLinks = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:#36F4A4;text-decoration:none;">$1</a>`)
      const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      const withItalic = withBold.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      return (
        <p key={i} style={{ color: '#A1A1AA', fontSize: '18px', lineHeight: 1.7, margin: '0 0 4px' }}
          dangerouslySetInnerHTML={{ __html: withItalic }} />
      )
    })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1)

  if (!post || post.status !== 'published') notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: post.authorName },
    publisher: { '@type': 'Organization', name: 'BisDak', url: 'https://bisdak.co.nz' },
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    url: `https://bisdak.co.nz/blog/${post.slug}`,
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>

        {/* Hero */}
        <section style={{ background: '#061A1C', padding: '72px 24px 56px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <Link href="/blog" style={{ color: '#36F4A4', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
              ← Back to News
            </Link>
            <p style={{ color: '#71717A', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 20px' }}>
              {post.authorName} · {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })
                : ''}
            </p>
            <h1 style={{
              color: '#ffffff',
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 330,
              lineHeight: 1.1,
              margin: '0 0 20px',
            }}>
              {post.title}
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: '20px', lineHeight: 1.5, margin: 0 }}>
              {post.excerpt}
            </p>
          </div>
        </section>

        {/* Content */}
        <section style={{ padding: '56px 24px 80px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {renderContent(post.content)}
          </div>
        </section>

        {/* Footer CTA */}
        <section style={{ background: '#102620', padding: '48px 24px', textAlign: 'center', borderTop: '1px solid #1E2C31' }}>
          <p style={{ color: '#A1A1AA', fontSize: '16px', margin: '0 0 20px' }}>
            Is your Filipino business listed on BisDak?
          </p>
          <Link href="/submit" className="btn-primary">Submit a Business — It&apos;s Free</Link>
        </section>
      </div>

      <footer style={{ background: '#000000', padding: '28px 24px', textAlign: 'center', borderTop: '1px solid #1E2C31' }}>
        <p style={{ color: '#52525B', fontSize: '14px', margin: 0 }}>
          © 2026 BisDak Pinoy Business Hub · bisdak.co.nz ·{' '}
          <Link href="/blog" style={{ color: '#71717A', textDecoration: 'none' }}>News</Link>
          {' · '}
          <Link href="/submit" style={{ color: '#71717A', textDecoration: 'none' }}>Submit a Business</Link>
        </p>
      </footer>
    </main>
  )
}
