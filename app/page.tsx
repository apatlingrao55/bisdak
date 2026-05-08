export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import HeroCarousel from '@/components/HeroCarousel'
import CategoryGrid from '@/components/CategoryGrid'
import BusinessCard from '@/components/BusinessCard'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews, posts } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import Link from 'next/link'

export default async function HomePage() {
  const allCategories = await db.select().from(categories)

  const latestPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(3)

  const featured = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      isFilipino: businesses.isFilipino,
      openStatus: businesses.openStatus,
      categoryName: categories.name,
      regionName: regions.name,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      reviewCount: sql<number>`COUNT(${reviews.id})`,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .leftJoin(reviews, eq(reviews.businessId, businesses.id))
    .where(eq(businesses.status, 'active'))
    .groupBy(businesses.id, categories.name, regions.name)
    .orderBy(desc(businesses.createdAt))
    .limit(6)

  return (
    <main>
      <Nav />
      <HeroCarousel />

      {/* Categories */}
      <section style={{ background: '#061A1C', padding: 'clamp(48px, 8vw, 80px) 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 12px', textAlign: 'center' }}>
            Browse by Category
          </h2>
          <p style={{ color: '#A1A1AA', textAlign: 'center', margin: '0 0 48px', fontSize: '18px' }}>
            8 categories covering every Filipino business in New Zealand
          </p>
          <CategoryGrid categories={allCategories} />
        </div>
      </section>

      {/* Featured Listings */}
      <section style={{ background: '#000000', padding: 'clamp(48px, 8vw, 80px) 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 12px' }}>
            Recently Added
          </h2>
          <p style={{ color: '#A1A1AA', margin: '0 0 48px', fontSize: '18px' }}>
            The latest Pinoy businesses listed on BisDak
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
            gap: '24px',
          }}>
            {featured.map(b => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <a href="/search" className="btn-ghost">View all listings →</a>
          </div>
        </div>
      </section>

      {/* News teaser */}
      {latestPosts.length > 0 && (
        <section style={{ background: '#061A1C', padding: 'clamp(48px, 8vw, 80px) 24px', borderTop: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ color: '#ffffff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 330, margin: '0 0 8px' }}>
                  News & Stories
                </h2>
                <p style={{ color: '#A1A1AA', margin: 0, fontSize: '17px' }}>
                  Community updates from the Pinoy business world
                </p>
              </div>
              <Link href="/blog" style={{ color: '#36F4A4', fontSize: '15px', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                All posts →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {latestPosts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <article style={{
                    background: '#02090A',
                    border: '1px solid #1E2C31',
                    borderRadius: '12px',
                    padding: '28px',
                    height: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 200ms ease',
                  }}>
                    <p style={{ color: '#52525B', fontSize: '12px', letterSpacing: '0.5px', margin: '0 0 12px' }}>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric' })
                        : ''}
                    </p>
                    <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 500, lineHeight: 1.3, margin: '0 0 12px' }}>
                      {post.title}
                    </h3>
                    <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: 1.6, margin: '0 0 20px' }}>
                      {post.excerpt.length > 100 ? post.excerpt.slice(0, 100) + '…' : post.excerpt}
                    </p>
                    <span style={{ color: '#36F4A4', fontSize: '14px', fontWeight: 500 }}>Read more →</span>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA strip */}
      <section style={{
        background: '#102620',
        padding: 'clamp(40px, 6vw, 56px) 24px',
        textAlign: 'center',
        borderTop: '1px solid #1E2C31',
      }}>
        <h3 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 330, margin: '0 0 12px' }}>
          Is your business missing?
        </h3>
        <p style={{ color: '#A1A1AA', margin: '0 0 28px', fontSize: '17px' }}>
          Submit a listing for free — it takes 2 minutes.
        </p>
        <a href="/submit" className="btn-primary" style={{ fontSize: '17px', padding: '14px 32px' }}>
          Submit a Business — It&apos;s Free
        </a>
      </section>

      <footer style={{ background: '#000000', padding: '28px 24px', textAlign: 'center', borderTop: '1px solid #1E2C31' }}>
        <p style={{ color: '#52525B', fontSize: '14px', margin: 0 }}>
          © 2026 BisDak Pinoy Business Hub · bisdak.co.nz ·{' '}
          <a href="/submit" style={{ color: '#71717A', textDecoration: 'none' }}>Submit a Business</a>
          {' · '}
          <a href="/admin" style={{ color: '#71717A', textDecoration: 'none' }}>Admin</a>
        </p>
      </footer>
    </main>
  )
}
