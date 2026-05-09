export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import Nav from '@/components/Nav'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { businesses, categories, regions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value ?? ''
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()
  return !!adminToken && session === adminToken
}

type Params = Promise<{ slug: string }>

export default async function EditBusinessPage({ params }: { params: Params }) {
  const admin = await isAdmin()
  const session = await auth()

  if (!admin && !session?.user?.id) redirect('/auth/sign-in')

  const { slug } = await params

  // Admin can edit any business; owner can only edit their own
  const [biz] = admin
    ? await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1)
    : await db.select().from(businesses).where(and(eq(businesses.slug, slug), eq(businesses.ownerId, session!.user!.id))).limit(1)

  if (!biz) redirect(admin ? '/admin' : '/dashboard')

  const allCategories = await db.select().from(categories)
  const allRegions = await db.select().from(regions)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>
        <section style={{ maxWidth: '640px', margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) 24px' }}>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 12px' }}>
            Edit Business
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: '18px', margin: '0 0 40px', lineHeight: 1.5 }}>
            Update your listing details. Changes go live immediately.
          </p>

          <form action={`/api/businesses/${slug}/edit`} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Business Name *</label>
              <input type="text" name="name" required maxLength={200} defaultValue={biz.name} className="input-dark" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Category</label>
                <select name="categoryId" className="input-dark" defaultValue={biz.categoryId ?? ''}>
                  <option value="">Select category</option>
                  {allCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Region</label>
                <select name="regionId" className="input-dark" defaultValue={biz.regionId ?? ''}>
                  <option value="">Select region</option>
                  {allRegions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Description <span style={{ color: '#52525B' }}>(max 500 chars)</span>
              </label>
              <textarea
                name="description"
                maxLength={500}
                rows={3}
                defaultValue={biz.description ?? ''}
                className="input-dark"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Phone</label>
                <input type="tel" name="phone" maxLength={30} defaultValue={biz.phone ?? ''} placeholder="+64 9 123 4567" className="input-dark" />
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" name="email" maxLength={100} defaultValue={biz.email ?? ''} placeholder="info@business.co.nz" className="input-dark" />
              </div>
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Website</label>
              <input type="url" name="website" maxLength={500} defaultValue={biz.website ?? ''} placeholder="https://example.co.nz" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Facebook URL</label>
              <input type="url" name="facebookUrl" maxLength={500} defaultValue={biz.facebookUrl ?? ''} placeholder="https://facebook.com/yourbusiness" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Google Maps URL</label>
              <input type="url" name="googleMapsUrl" maxLength={500} defaultValue={biz.googleMapsUrl ?? ''} placeholder="https://maps.google.com/..." className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Photo URL</label>
              <input type="url" name="photoUrl" maxLength={500} defaultValue={biz.photoUrl ?? ''} placeholder="https://example.com/photo.jpg" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Open Status</label>
              <select name="openStatus" className="input-dark" defaultValue={biz.openStatus ?? ''}>
                <option value="">Not set</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="submit" className="btn-primary" style={{ height: '52px', fontSize: '16px', flex: 1 }}>
                Save Changes
              </button>
              <a href={admin ? '/admin' : '/dashboard'} className="btn-ghost" style={{ height: '52px', fontSize: '16px', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                Cancel
              </a>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
