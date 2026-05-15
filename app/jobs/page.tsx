export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import JobCard from '@/components/JobCard'
import JobFilters from '@/components/JobFilters'
import { db } from '@/lib/db'
import { regions } from '@/lib/db/schema'
import { listActiveJobs } from '@/lib/jobs/queries'

type SearchParams = Promise<{ region?: string; type?: string; q?: string }>

export const metadata = {
  title: { absolute: 'Jobs — BisDak NZ' },
  description: 'Browse jobs at Filipino-owned businesses across New Zealand.',
  alternates: { canonical: '/jobs' },
}

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const filters = {
    regionSlug: sp.region?.trim() || null,
    employmentType: sp.type?.trim() || null,
    q: sp.q?.trim() || null,
  }

  const [allRegions, jobsList] = await Promise.all([
    db.select({ slug: regions.slug, name: regions.name }).from(regions).orderBy(regions.name),
    listActiveJobs(filters),
  ])

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <section style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) 24px' }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 12px' }}>Jobs</h1>
          <p style={{ color: '#A1A1AA', fontSize: 17, margin: '0 0 28px' }}>
            Roles at Filipino-owned businesses across New Zealand.
          </p>

          <JobFilters
            regions={allRegions}
            current={{ region: filters.regionSlug ?? undefined, type: filters.employmentType ?? undefined, q: filters.q ?? undefined }}
          />

          {jobsList.length === 0 ? (
            <p style={{ color: '#A1A1AA', padding: '24px 0' }}>No jobs match these filters yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {jobsList.map(j => (
                <JobCard
                  key={j.id}
                  id={j.id}
                  title={j.title}
                  businessName={j.businessName}
                  regionName={j.regionName}
                  employmentType={j.employmentType}
                  salary={j.salary}
                  postedAt={j.postedAt}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
