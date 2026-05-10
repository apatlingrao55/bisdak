export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import ApplyButton from '@/components/ApplyButton'
import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getActiveJobById } from '@/lib/jobs/queries'

type Params = Promise<{ id: string }>

const TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  casual: 'Casual',
  contract: 'Contract',
}

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const row = await getActiveJobById(id)
  if (!row) return { title: 'Job not found' }
  return {
    title: `${row.job.title} at ${row.business.name} — BisDak Jobs`,
    description: row.job.description.slice(0, 160),
  }
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const row = await getActiveJobById(id)
  if (!row) notFound()

  const session = await auth()
  const { job, business, regionName } = row

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) 24px' }}>
          <Link href="/jobs" style={{ color: '#A1A1AA', fontSize: 14, textDecoration: 'none' }}>← All jobs</Link>

          <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 330, margin: '20px 0 8px' }}>
            {job.title}
          </h1>
          <div style={{ color: '#A1A1AA', fontSize: 16, marginBottom: 24 }}>
            <Link href={`/business/${business.slug}`} style={{ color: '#36F4A4', textDecoration: 'none' }}>
              {business.name}
            </Link>
            {regionName && <> · {regionName}</>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            <span style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 9999 }}>
              {TYPE_LABEL[job.employmentType] ?? job.employmentType}
            </span>
            {job.salary && (
              <span style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, padding: '5px 12px', borderRadius: 9999 }}>
                {job.salary}
              </span>
            )}
          </div>

          <p style={{ color: '#E4E4E7', fontSize: 16, lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: '0 0 36px' }}>
            {job.description}
          </p>

          <ApplyButton
            jobId={job.id}
            applyUrl={job.applyUrl}
            applyEmail={job.applyEmail}
            isSignedIn={!!session?.user?.id}
          />

          <p style={{ color: '#71717A', fontSize: 13, marginTop: 16 }}>
            Posted {new Date(job.postedAt).toLocaleDateString('en-NZ')}
          </p>
        </article>
      </div>
    </main>
  )
}
