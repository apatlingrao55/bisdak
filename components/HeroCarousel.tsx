'use client'
import { useRef } from 'react'
import InstallButton from './InstallButton'

const HERO_VIDEO = 'https://yjotmehqsvojjoamwxak.supabase.co/storage/v1/object/public/photos/videos/jeepney2.mp4'

export default function HeroCarousel() {
  return (
    <section style={{ position: 'relative', minHeight: '100vh', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>

      {/* Video background */}
      <video
        ref={(el) => { if (el) el.playbackRate = 0.5 }}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      {/* Dark overlay for text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)',
      }} />

      {/* Text content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(72px, 10vh, 120px) clamp(32px, 6vw, 64px) clamp(64px, 8vh, 100px)',
        boxSizing: 'border-box',
      }}>
        <p style={{ color: '#36F4A4', fontSize: 12, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 16px' }}>
          Pinoy Business Hub NZ
        </p>
        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 84px)',
          fontWeight: 330,
          lineHeight: 1.02,
          color: '#fff',
          margin: '0 0 20px',
          maxWidth: 680,
          whiteSpace: 'pre-line',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {'Find Filipino\nbusinesses in NZ.'}
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: 'clamp(15px, 2vw, 19px)',
          margin: '0 0 36px',
          maxWidth: 480,
          lineHeight: 1.55,
          textShadow: '0 1px 8px rgba(0,0,0,0.4)',
        }}>
          The definitive directory of Filipino-owned businesses across New Zealand. From adobo to accounting — find your kababayan.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <a href="/search" className="btn-primary" style={{ fontSize: 16, padding: '13px 28px' }}>
            Browse All Businesses →
          </a>
          <a href="/submit" className="btn-ghost" style={{ fontSize: 16, padding: '13px 28px' }}>
            Submit a Business
          </a>
          <InstallButton />
        </div>
      </div>
    </section>
  )
}
