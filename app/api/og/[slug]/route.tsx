import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getBusinessBySlug } from '@/lib/db/queries'
import { getCategoryColor } from '@/lib/category-color'

export const runtime = 'nodejs'

let fontCache: Buffer | null = null

async function loadFont(): Promise<Buffer> {
  if (fontCache) return fontCache
  const data = await readFile(join(process.cwd(), 'assets/fonts/Inter-SemiBold.ttf'))
  fontCache = data
  return data
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

function getHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

type Params = Promise<{ slug: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { slug } = await params

  if (!/^[a-z0-9-]{1,200}$/.test(slug)) {
    return new Response('Invalid slug', { status: 400 })
  }

  const biz = await getBusinessBySlug(slug)
  if (!biz) return new Response('Not found', { status: 404 })

  const font = await loadFont()

  // Pre-fetch external image with timeout + SSRF protection
  let photoSrc: string | null = null
  if (biz.photoUrl) {
    try {
      const url = new URL(biz.photoUrl)
      if (url.protocol === 'https:') {
        const resp = await fetch(biz.photoUrl, {
          signal: AbortSignal.timeout(3000),
        })
        if (resp.ok) {
          const buf = await resp.arrayBuffer()
          const contentType = resp.headers.get('content-type') ?? 'image/jpeg'
          photoSrc = `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`
        }
      }
    } catch {
      // Fall back to placeholder
    }
  }

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        background: '#02090A', fontFamily: 'Inter', color: '#ffffff',
      }}>
        {/* Photo or placeholder banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '220px', overflow: 'hidden',
          background: photoSrc ? '#1E2C31' : getCategoryColor(biz.categoryName),
        }}>
          {photoSrc ? (
            <img src={photoSrc} width={1200} height={220}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '80px' }}>{biz.categoryIcon ?? '🏢'}</span>
          )}
        </div>

        {/* Business details */}
        <div style={{
          display: 'flex', flexDirection: 'column', flex: 1,
          padding: '32px 48px', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '42px', fontWeight: 600 }}>
              {truncate(biz.name, 40)}
            </span>
            {biz.isFilipino && (
              <span style={{
                background: 'rgba(54,244,164,0.15)', color: '#36F4A4',
                borderRadius: '9999px', padding: '6px 16px', fontSize: '18px', fontWeight: 600,
              }}>
                Filipino-owned
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '22px', color: '#A1A1AA' }}>
            {biz.categoryName && <span>{biz.categoryName}</span>}
            {biz.regionName && <span>📍 {biz.regionName}</span>}
          </div>

          <div style={{ display: 'flex', gap: '24px', fontSize: '20px', color: '#71717A', marginTop: '8px' }}>
            {biz.website && <span>🌐 {getHostname(biz.website)}</span>}
          </div>
        </div>

        {/* Watermark bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 48px', borderTop: '1px solid #1E2C31',
          fontSize: '18px', color: '#52525B',
        }}>
          <span>bisdak.co.nz</span>
          <span>Pinoy Business Hub NZ</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: font, weight: 600, style: 'normal' as const }],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
      },
    }
  )
}
