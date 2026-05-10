export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import JobStatusBadge from '@/components/JobStatusBadge'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listJobsForOwner } from '@/lib/jobs/queries'

export default async function DashboardJobsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/sign-in?callbackUrl=/dashboard/jobs')

  const myJobs = await listJobsForOwner(session.user.id)

  const open = myJobs.filter(j => j.status === 'open' && !j.closedAt && new Date(j.expiresAt) > new Date())
  const closed = myJobs.filter(j => j.status === 'closed' || j.closedAt)
  const expired = myJobs.filter(j => j.status === 'open' && !j.closedAt && new Date(j.expiresAt) <= new Date())

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: 64, minHeight: '100vh', background: '#000' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
            <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 330, margin: 0 }}>My job listings</h1>
            <Link href="/dashboard/jobs/new" className="btn-primary" style={{ padding: '10px 22px', fontSize: 15 }}>
              + New job
            </Link>
          </div>

          {myJobs.length === 0 && (
            <p style={{ color: '#A1A1AA' }}>No jobs yet. Click <strong>New job</strong> to post one.</p>
          )}

          {[
            { label: 'Open', items: open },
            { label: 'Closed', items: closed },
            { label: 'Expired', items: expired },
          ].map(group => group.items.length > 0 && (
            <section key={group.label} style={{ marginBottom: 40 }}>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 400, margin: '0 0 14px' }}>{group.label}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map(j => (
                  <Link
                    key={j.id}
                    href={`/dashboard/jobs/${j.id}/edit`}
                    style={{
                      background: '#0A0A0A',
                      border: '1px solid #1F1F22',
                      borderRadius: 10,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: 15, marginBottom: 2 }}>{j.title}</div>
                      <div style={{ color: '#A1A1AA', fontSize: 13 }}>{j.businessName}</div>
                    </div>
                    <JobStatusBadge status={j.status as 'open' | 'closed'} expiresAt={j.expiresAt} closedAt={j.closedAt} />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
