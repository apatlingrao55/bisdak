export const revalidate = 600

import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { SITE_BASE, jsonLdScript } from '@/lib/seo'
import { authorIsTeam, slugifyAuthor } from '@/lib/authors'

type Props = { params: Promise<{ slug: string }> }

async function findAuthor(slug: string) {
  const rows = await db
    .selectDistinct({ name: posts.authorName })
    .from(posts)
    .where(eq(posts.status, 'published'))
  const match = rows.find(r => slugifyAuthor(r.name) === slug)
  return match?.name ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const name = await findAuthor(slug)
  if (!name) return { robots: { index: false, follow: false } }
  return {
    title: `${name} — Writer`,
    description: `Articles and guides by ${name} for the Kiwi-Filipino community on BisDak.`,
    alternates: { canonical: `/authors/${slug}` },
  }
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const name = await findAuthor(slug)
  if (!name) notFound()

  const authorPosts = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(sql`${posts.authorName} = ${name} AND ${posts.status} = 'published'`)
    .orderBy(desc(posts.publishedAt))

  const isTeam = authorIsTeam(name)
  const jsonLd = isTeam
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_BASE}/#organization`,
        name,
        url: `${SITE_BASE}/authors/${slug}`,
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        url: `${SITE_BASE}/authors/${slug}`,
        affiliation: { '@id': `${SITE_BASE}/#organization` },
      }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <Nav />
      <article style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <header
          style={{
            background: '#061A1C',
            padding: 'clamp(48px, 8vw, 80px) clamp(24px, 5vw, 32px) clamp(40px, 6vw, 64px)',
            borderBottom: '1px solid #1E2C31',
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <p
              style={{
                color: '#36F4A4',
                fontSize: 12,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontWeight: 600,
                margin: '0 0 16px',
              }}
            >
              Author
            </p>
            <h1
              style={{
                color: '#fff',
                fontSize: 'clamp(36px, 6vw, 56px)',
                fontWeight: 330,
                lineHeight: 1.1,
                margin: '0 0 16px',
              }}
            >
              {name}
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: 17, lineHeight: 1.6, margin: 0 }}>
              {isTeam
                ? "The BisDak editorial team — covering Filipino-owned businesses, NZ immigration guides, balikbayan shipping, and the Kiwi-Filipino community."
                : `${name} writes for BisDak about Filipino-owned businesses and the Kiwi-Filipino community.`}
            </p>
          </div>
        </header>

        <section style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 400, margin: '0 0 24px' }}>
            {authorPosts.length} post{authorPosts.length === 1 ? '' : 's'}
          </h2>
          {authorPosts.length === 0 ? (
            <p style={{ color: '#A1A1AA' }}>No published posts yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {authorPosts.map((p, i) => (
                <article
                  key={p.id}
                  style={{
                    padding: '32px 0',
                    borderBottom: i < authorPosts.length - 1 ? '1px solid #1E2C31' : 'none',
                  }}
                >
                  <p style={{ color: '#52525B', fontSize: 13, letterSpacing: '0.5px', margin: '0 0 10px' }}>
                    {p.publishedAt
                      ? new Date(p.publishedAt).toLocaleDateString('en-NZ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : ''}
                  </p>
                  <h3 style={{ margin: '0 0 10px' }}>
                    <Link
                      href={`/blog/${p.slug}`}
                      style={{
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: 'clamp(20px, 2.5vw, 24px)',
                        fontWeight: 400,
                        lineHeight: 1.25,
                      }}
                    >
                      {p.title}
                    </Link>
                  </h3>
                  <p style={{ color: '#A1A1AA', fontSize: 16, lineHeight: 1.6, margin: '0 0 14px' }}>{p.excerpt}</p>
                  <Link
                    href={`/blog/${p.slug}`}
                    style={{ color: '#36F4A4', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
                  >
                    Read more →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  )
}
