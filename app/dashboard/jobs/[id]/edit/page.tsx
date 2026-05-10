export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import JobForm from '@/components/JobForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getJobIfOwner } from '@/lib/jobs/auth'

type Params = Promise<{ id: string }>

export default async function EditJobPage({ params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/sign-in')
  const { id } = await params

  const job = await getJobIfOwner(session.user.id, id)
  if (!job) redirect('/dashboard/jobs')

  const [business] = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, job.businessId))
    .limit(1)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <section style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) 24px' }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 330, margin: '0 0 32px' }}>Edit job</h1>

          <JobForm
            action={`/api/jobs/${job.id}`}
            businesses={[business]}
            defaults={{
              businessId: job.businessId,
              title: job.title,
              description: job.description,
              employmentType: job.employmentType as 'full_time' | 'part_time' | 'casual' | 'contract',
              applyUrl: job.applyUrl,
              applyEmail: job.applyEmail,
              salary: job.salary,
            }}
            submitLabel="Save changes"
          />

          <form action={`/api/jobs/${job.id}/close`} method="POST" style={{ marginTop: 32, borderTop: '1px solid #27272A', paddingTop: 24 }}>
            <p style={{ color: '#A1A1AA', fontSize: 14, margin: '0 0 12px' }}>
              Filled the role or no longer hiring? Close the listing to remove it from the public board.
            </p>
            <button type="submit" className="btn-ghost" style={{ padding: '10px 22px' }}>
              Close this job
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
