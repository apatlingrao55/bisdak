'use client'

import Link from 'next/link'
import StarRating from './StarRating'
import { getCategoryColor } from '@/lib/category-color'

type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  isFilipino: boolean | null
  categoryName: string | null
  categoryIcon: string | null
  regionName: string | null
  avgRating: number
  reviewCount: number
  openStatus: string | null
  photoUrl: string | null
  phone: string | null
  email: string | null
  website: string | null
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
        textDecoration: 'none',
        transition: 'transform 200ms ease, border-color 200ms ease',
        overflow: 'hidden',
      }}
      className="shadow-card hover:border-[#1E2C31]"
    >
      {/* Photo / Placeholder */}
      <div style={{
        width: '100%',
        height: '160px',
        overflow: 'hidden',
        background: business.photoUrl ? '#1E2C31' : getCategoryColor(business.categoryName),
      }}>
        {business.photoUrl ? (
          <img
            src={business.photoUrl}
            alt={business.name}
            loading="lazy"
            width={400}
            height={160}
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              if (target.parentElement) {
                target.parentElement.style.background = getCategoryColor(business.categoryName)
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px',
          }}>
            {business.categoryIcon ?? '🏢'}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
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
            margin: '0 0 12px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {business.description}
          </p>
        )}

        {/* Contact details (display-only) */}
        {(business.phone || business.email || business.website) && (
          <div style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap',
            marginBottom: '12px', fontSize: '13px', color: '#71717A',
          }}>
            {business.phone && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📞 {business.phone}
              </span>
            )}
            {business.email && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                ✉️ {business.email}
              </span>
            )}
            {business.website && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                🌐 {(() => { try { return new URL(business.website).hostname } catch { return business.website } })()}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {business.avgRating > 0 ? (
              <>
                <StarRating rating={Math.round(business.avgRating)} />
                <span style={{ color: '#71717A', fontSize: '13px' }}>
                  ({business.reviewCount})
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
      </div>
    </Link>
  )
}
