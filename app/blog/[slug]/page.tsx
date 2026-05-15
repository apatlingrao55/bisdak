export const revalidate = 300

import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { renderContent } from '@/lib/blog-renderer'
import { SITE_BASE, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'
import { slugifyAuthor, authorIsTeam } from '@/lib/authors'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)
  if (!post) return {}
  const hasBrand = /bisdak/i.test(post.title)
  return {
    // If the post title already contains "BisDak" (e.g. the welcome post),
    // skip the template suffix so the brand only appears once.
    title: hasBrand ? { absolute: post.title } : post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_BASE}/blog/${slug}`,
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      images: [{ url: `${SITE_BASE}/opengraph-image`, width: 1200, height: 630, alt: post.title }],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1)

  if (!post || post.status !== 'published') notFound()

  const url = `${SITE_BASE}/blog/${post.slug}`
  const isTeam = authorIsTeam(post.authorName)
  const authorSlug = slugifyAuthor(post.authorName)
  const datePublished = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined
  const dateModified = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: {
      '@type': 'ImageObject',
      url: `${SITE_BASE}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    author: isTeam
      ? { '@type': 'Organization', '@id': `${SITE_BASE}/#organization`, name: post.authorName }
      : { '@type': 'Person', name: post.authorName, url: `${SITE_BASE}/authors/${authorSlug}` },
    publisher: { '@id': `${SITE_BASE}/#organization` },
    datePublished,
    dateModified,
    url,
  }

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'News & Stories', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ])

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbLd)} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>

        {/* Hero */}
        <section style={{ background: '#061A1C', padding: '72px 24px 56px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <Link href="/blog" style={{ color: '#36F4A4', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
              ← Back to News
            </Link>
            <p style={{ color: '#71717A', fontSize: '13px', letterSpacing: '0.5px', margin: '0 0 20px' }}>
              {isTeam ? (
                post.authorName
              ) : (
                <Link href={`/authors/${authorSlug}`} style={{ color: '#A1A1AA', textDecoration: 'none' }}>{post.authorName}</Link>
              )}
              {' · '}
              {post.publishedAt
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
