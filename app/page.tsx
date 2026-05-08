import Nav from '@/components/Nav'
import SearchBar from '@/components/SearchBar'
import CategoryGrid from '@/components/CategoryGrid'
import BusinessCard from '@/components/BusinessCard'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export default async function HomePage() {
  const allCategories = await db.select().from(categories)

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
    .groupBy(businesses.id)
    .orderBy(desc(businesses.createdAt))
    .limit(6)

  return (
    <main>
      <Nav />

      {/* Hero */}
      <section style={{
        background: '#000000',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#A1A1AA', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 24px', fontWeight: 500 }}>
          New Zealand&apos;s Filipino Business Directory
        </p>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 330,
          lineHeight: 1.0,
          color: '#ffffff',
          margin: '0 0 28px',
          maxWidth: '820px',
          letterSpacing: '-0.5px',
        }}>
          Find your<br />kababayan&apos;s business.
        </h1>
        <p style={{
          color: '#A1A1AA',
          fontSize: '20px',
          fontWeight: 400,
          margin: '0 0 48px',
          maxWidth: '520px',
          lineHeight: 1.5,
        }}>
          Discover, review, and support Filipino-owned businesses across every region of New Zealand.
        </p>
        <SearchBar />

        <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ color: '#52525B', fontSize: '14px' }}>Popular:</span>
          {[
            { label: 'Food & Dining', slug: 'food-dining' },
            { label: 'Remittance & Travel', slug: 'remittance-travel' },
            { label: 'Health & Wellness', slug: 'health-wellness' },
          ].map(tag => (
            <a
              key={tag.slug}
              href={`/search?category=${tag.slug}`}
              style={{ color: '#71717A', fontSize: '14px', textDecoration: 'underline', textDecorationColor: '#3F3F46' }}
            >
              {tag.label}
            </a>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{ background: '#061A1C', padding: '80px 24px' }}>
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
      <section style={{ background: '#000000', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 12px' }}>
            Recently Added
          </h2>
          <p style={{ color: '#A1A1AA', margin: '0 0 48px', fontSize: '18px' }}>
            The latest Filipino businesses listed on Filipino Hub NZ
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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

      {/* CTA strip */}
      <section style={{
        background: '#102620',
        padding: '56px 24px',
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
          © 2026 Filipino Hub NZ ·{' '}
          <a href="/submit" style={{ color: '#71717A', textDecoration: 'none' }}>Submit a Business</a>
          {' · '}
          <a href="/admin?token=admin123" style={{ color: '#71717A', textDecoration: 'none' }}>Admin</a>
        </p>
      </footer>
    </main>
  )
}
