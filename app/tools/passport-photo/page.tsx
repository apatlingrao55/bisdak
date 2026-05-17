import Nav from '@/components/Nav'
import PassportPhotoTool from './PassportPhotoTool'
import { webApplicationJsonLd, jsonLdScript } from '@/lib/seo'

export const metadata = {
  title: 'Free NZ & AU Passport Photo Tool',
  description:
    'Crop your passport photo to the correct size for New Zealand and Australia applications. Free, instant, and private — all processing happens in your browser.',
  alternates: { canonical: '/tools/passport-photo' },
}

const appLd = webApplicationJsonLd({
  name: 'NZ & AU Passport Photo Crop Tool',
  path: '/tools/passport-photo',
  description:
    'Free browser-based tool to crop passport photos to the correct size for NZ and AU applications.',
  category: 'UtilityApplication',
})

export default function PassportPhotoPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(appLd)} />
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: 'clamp(40px, 6vw, 64px) 24px 80px',
            color: '#D4D4D8',
            fontSize: 15,
            lineHeight: 1.8,
          }}
        >
          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontWeight: 330,
              margin: '0 0 12px',
              letterSpacing: '-0.3px',
            }}
          >
            NZ &amp; AU passport photo tool
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            Upload a photo, position your face in the frame, and download a correctly cropped
            passport photo. Free · Instant · Private.
          </p>

          <PassportPhotoTool />
        </article>
      </div>
    </main>
  )
}
