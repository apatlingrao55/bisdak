'use client'

import { useState } from 'react'

type Business = {
  id: string
  name: string
  slug: string
  status: string | null
  categoryName: string | null
  regionName: string | null
  ownerId: string | null
}

export default function BusinessFilter({ businesses }: { businesses: Business[] }) {
  const [query, setQuery] = useState('')

  const filtered = businesses.filter(biz => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      biz.name.toLowerCase().includes(q) ||
      (biz.categoryName?.toLowerCase().includes(q) ?? false) ||
      (biz.regionName?.toLowerCase().includes(q) ?? false) ||
      biz.slug.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <input
        type="text"
        placeholder="Filter by name, category, region..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="input-dark"
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}
      />
      <p style={{ color: '#52525B', fontSize: '13px', margin: '0 0 16px' }}>
        Showing {filtered.length} of {businesses.length}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map(biz => (
          <div key={biz.id} style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: '#ffffff', fontWeight: 500, fontSize: '16px' }}>{biz.name}</span>
              <span style={{ color: '#52525B', fontSize: '13px', marginLeft: '12px' }}>
                {[biz.categoryName, biz.regionName].filter(Boolean).join(' · ')}
              </span>
              <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: biz.status === 'active' ? 'rgba(54,244,164,0.1)' : 'rgba(113,113,122,0.2)', color: biz.status === 'active' ? '#36F4A4' : '#71717A' }}>
                  {biz.status}
                </span>
                {biz.ownerId && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(96,165,250,0.1)', color: '#60A5FA' }}>
                    claimed
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <a href={`/dashboard/edit/${biz.slug}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none' }}>
                Edit
              </a>
              <a href={`/business/${biz.slug}`} target="_blank" style={{ color: '#71717A', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '8px 12px', border: '1px solid #3F3F46', borderRadius: '9999px' }}>
                View
              </a>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${biz.name}"? This also removes its reviews and claims. This cannot be undone.`)) return
                  const res = await fetch('/api/admin/businesses', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: biz.id }),
                  })
                  if (res.ok) window.location.reload()
                  else alert('Failed to delete business')
                }}
                style={{
                  background: 'transparent',
                  color: '#F87171',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '9999px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: '#52525B', fontSize: '15px' }}>No businesses match your search.</p>
        )}
      </div>
    </>
  )
}
