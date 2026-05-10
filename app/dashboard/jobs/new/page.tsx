export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import JobForm from '@/components/JobForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { businesses, businessClaims } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export default async function NewJobPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/sign-in?callbackUrl=/dashboard/jobs/new')

  const myBusinesses = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .innerJoin(
      businessClaims,
      and(eq(businessClaims.businessId, businesses.id), eq(businessClaims.userId, session.user.id), eq(businessClaims.status, 'approved')),
    )

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <section style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) 24px' }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 330, margin: '0 0 12px' }}>Post a job</h1>
          <p style={{ color: '#A1A1AA', fontSize: 17, margin: '0 0 32px' }}>
            Listings auto-expire after 60 days. You can close them earlier from the dashboard.
          </p>

          {myBusinesses.length === 0 ? (
            <p style={{ color: '#A1A1AA' }}>
              You need to claim a business before posting a job. <a href="/search" style={{ color: '#36F4A4' }}>Find your business →</a>
            </p>
          ) : (
            <JobForm action="/api/jobs" businesses={myBusinesses} submitLabel="Post job" />
          )}
        </section>
      </div>
    </main>
  )
}
