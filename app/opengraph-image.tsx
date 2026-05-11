import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'BisDak — Pinoy Business Hub NZ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const iconSvg = await readFile(join(process.cwd(), 'public/icons/icon.svg'), 'utf-8')
  const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#061A1C',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: 14, height: '100%', background: '#36F4A4' }} />

        <div
          style={{
            display: 'flex',
            width: 480,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src={iconDataUri} width={340} height={340} alt="" />
        </div>

        <div
          style={{
            display: 'flex',
            width: 1,
            marginTop: 90,
            marginBottom: 90,
            background: '#1E2C31',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            paddingLeft: 64,
            paddingRight: 64,
          }}
        >
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            BisDak
          </div>
          <div
            style={{
              fontSize: 44,
              color: '#36F4A4',
              marginTop: 24,
              fontWeight: 500,
            }}
          >
            Pinoy Business Hub NZ
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 30,
              color: '#A1A1AA',
              marginTop: 32,
              lineHeight: 1.3,
            }}
          >
            <span>New Zealand&apos;s Filipino</span>
            <span>Business Directory</span>
          </div>
          <div
            style={{
              fontSize: 44,
              color: '#FFFFFF',
              fontWeight: 600,
              marginTop: 56,
              letterSpacing: -0.5,
            }}
          >
            bisdak.co.nz
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
