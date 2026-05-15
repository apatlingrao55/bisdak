export const revalidate = 300

import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import { db } from '@/lib/db'
import { categories, regions } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Submit a Business',
  description:
    "List your Filipino-owned business on BisDak for free. NZ-wide directory of Filipino businesses across Auckland, Wellington, Canterbury, Waikato, and beyond.",
  alternates: { canonical: '/submit' },
}

type SearchParams = Promise<{ success?: string }>

export default async function SubmitPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const success = params.success === '1'

  const allCategories = await db.select().from(categories)
  const allRegions = await db.select().from(regions)

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>
        <section style={{ maxWidth: '640px', margin: '0 auto', padding: 'clamp(32px, 6vw, 60px) 24px' }}>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 330, margin: '0 0 12px' }}>
            Submit a Business
          </h1>
          <p style={{ color: '#A1A1AA', fontSize: '18px', margin: '0 0 40px', lineHeight: 1.5 }}>
            Know a Filipino business that should be listed? Submit it below — it&apos;s free. We&apos;ll review it within 24–48 hours.
          </p>

          {success && (
            <div style={{
              background: 'rgba(54,244,164,0.08)',
              border: '1px solid rgba(54,244,164,0.25)',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '32px',
              color: '#36F4A4',
              fontSize: '15px',
            }}>
              ✅ Your submission has been received! We&apos;ll review it within 24–48 hours.
            </div>
          )}

          <form action="/api/submit" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Business Name *</label>
              <input type="text" name="name" required maxLength={200} placeholder="e.g. Aling Rosa Catering" className="input-dark" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Category *</label>
                <select name="categoryId" required className="input-dark">
                  <option value="">Select category</option>
                  {allCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Region *</label>
                <select name="regionId" required className="input-dark">
                  <option value="">Select region</option>
                  {allRegions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Phone</label>
              <input type="tel" name="phone" placeholder="+64 9 123 4567" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Website</label>
              <input type="url" name="website" placeholder="https://example.co.nz" className="input-dark" />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Description * <span style={{ color: '#52525B' }}>(max 200 chars)</span>
              </label>
              <textarea
                name="description"
                required
                maxLength={200}
                rows={3}
                placeholder="Brief description of what this business does..."
                className="input-dark"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ color: '#A1A1AA', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Your Email <span style={{ color: '#52525B' }}>(optional — to receive updates)</span>
              </label>
              <input type="email" name="submitterEmail" placeholder="you@example.com" className="input-dark" />
            </div>

            <button type="submit" className="btn-primary" style={{ height: '52px', fontSize: '16px' }}>
              Submit for Review
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
