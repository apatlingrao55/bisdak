import Link from 'next/link'
import StarRating from './StarRating'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  isFilipino: boolean | null
  categoryName?: string | null
  regionName?: string | null
  avgRating?: number
  reviewCount?: number
  openStatus?: string | null
}

export default function BusinessCard({ business }: { business: Business }) {
  return (
    <Link
      href={`/business/${business.slug}`}
      style={{
        display: 'block',
        background: '#02090A',
        border: '1px solid #1E2C31',
        borderRadius: '12px',
        padding: '24px',
        textDecoration: 'none',
        transition: 'transform 200ms ease, border-color 200ms ease',
      }}
      className="shadow-card hover:border-[#1E2C31]"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          {business.name}
        </h3>
        {business.isFilipino && (
          <span style={{
            background: 'rgba(54,244,164,0.12)',
            color: '#36F4A4',
            border: '1px solid rgba(54,244,164,0.25)',
            borderRadius: '9999px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            🇵🇭 Filipino-owned
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {business.categoryName && (
          <span style={{
            background: 'rgba(255,255,255,0.08)',
            color: '#ffffff',
            borderRadius: '9999px',
            padding: '3px 10px',
            fontSize: '13px',
          }}>
            {business.categoryName}
          </span>
        )}
        {business.regionName && (
          <span style={{ color: '#71717A', fontSize: '13px' }}>
            📍 {business.regionName}
          </span>
        )}
      </div>

      {business.description && (
        <p style={{
          color: '#A1A1AA',
          fontSize: '15px',
          lineHeight: 1.5,
          margin: '0 0 14px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {business.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {business.avgRating != null && business.avgRating > 0 ? (
            <>
              <StarRating rating={Math.round(business.avgRating)} />
              <span style={{ color: '#71717A', fontSize: '13px' }}>
                ({business.reviewCount ?? 0})
              </span>
            </>
          ) : (
            <span style={{ color: '#52525B', fontSize: '13px' }}>No reviews yet</span>
          )}
        </div>
        {business.openStatus && (
          <span style={{
            color: business.openStatus === 'open' ? '#36F4A4' : '#71717A',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            ● {business.openStatus === 'open' ? 'Open' : 'Closed'}
          </span>
        )}
      </div>
    </Link>
  )
}
