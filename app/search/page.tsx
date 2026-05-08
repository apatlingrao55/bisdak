import Nav from '@/components/Nav'
import BusinessCard from '@/components/BusinessCard'
import SearchBar from '@/components/SearchBar'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, like, and, desc, asc, sql, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

type SearchParams = Promise<{
  q?: string
  category?: string
  region?: string
  sort?: string
}>

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const q = params.q ?? ''
  const categorySlug = params.category ?? ''
  const regionSlug = params.region ?? ''
  const sort = params.sort ?? 'newest'

  const allCategories = await db.select().from(categories)
  const allRegions = await db.select().from(regions)

  const conditions: SQL[] = [eq(businesses.status, 'active') as SQL]

  if (q.trim()) {
    const searchCond = or(
      like(businesses.name, `%${q}%`),
      like(businesses.description, `%${q}%`)
    )
    if (searchCond) conditions.push(searchCond as SQL)
  }

  if (categorySlug) {
    const cat = allCategories.find(c => c.slug === categorySlug)
    if (cat) conditions.push(eq(businesses.categoryId, cat.id) as SQL)
  }

  if (regionSlug) {
    const reg = allRegions.find(r => r.slug === regionSlug)
    if (reg) conditions.push(eq(businesses.regionId, reg.id) as SQL)
  }

  const orderBy = sort === 'alpha' ? asc(businesses.name) : desc(businesses.createdAt)

  const results = await db
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
    .where(and(...conditions))
    .groupBy(businesses.id, categories.name, regions.name)
    .orderBy(orderBy)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>

        {/* Search header */}
        <section style={{ background: '#061A1C', padding: '32px 24px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <SearchBar defaultValue={q} />
          </div>
        </section>

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', display: 'flex', gap: '48px', alignItems: 'flex-start' }}>

          {/* Sidebar filters */}
          <aside style={{ width: '220px', flexShrink: 0 }} className="hidden md:block">
            <form method="GET" action="/search">
              {q && <input type="hidden" name="q" value={q} />}

              <div style={{ marginBottom: '36px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Category
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: categorySlug === '' ? '#ffffff' : '#A1A1AA', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="radio" name="category" value="" defaultChecked={!categorySlug} style={{ accentColor: '#36F4A4' }} />
                    All categories
                  </label>
                  {allCategories.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: categorySlug === cat.slug ? '#ffffff' : '#A1A1AA', fontSize: '14px', cursor: 'pointer' }}>
                      <input type="radio" name="category" value={cat.slug} defaultChecked={categorySlug === cat.slug} style={{ accentColor: '#36F4A4' }} />
                      {cat.icon} {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '36px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Region
                </h3>
                <select name="region" defaultValue={regionSlug} className="input-dark" style={{ fontSize: '14px' }}>
                  <option value="">All regions</option>
                  {allRegions.map(r => (
                    <option key={r.id} value={r.slug}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '36px' }}>
                <h3 style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Sort by
                </h3>
                <select name="sort" defaultValue={sort} className="input-dark" style={{ fontSize: '14px' }}>
                  <option value="newest">Newest first</option>
                  <option value="alpha">A – Z</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Apply Filters
              </button>
            </form>
          </aside>

          {/* Results */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#A1A1AA', fontSize: '16px', margin: 0 }}>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{results.length}</span>{' '}
                business{results.length !== 1 ? 'es' : ''} found
                {q && (
                  <span> for &ldquo;<span style={{ color: '#36F4A4' }}>{q}</span>&rdquo;</span>
                )}
              </p>
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔍</p>
                <p style={{ fontSize: '18px', color: '#A1A1AA', margin: '0 0 8px' }}>No businesses found.</p>
                <p style={{ fontSize: '15px', color: '#52525B' }}>
                  Try a different search or{' '}
                  <a href="/submit" style={{ color: '#36F4A4' }}>submit a listing</a>.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {results.map(b => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
