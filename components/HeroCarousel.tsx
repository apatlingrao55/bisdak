'use client'
import { useState, useEffect, useRef } from 'react'

const slides = [
  {
    id: 1,
    label: 'Food & Dining',
    title: 'Lutong Pinoy,\nright in your city.',
    subtitle: 'From adobo to lechon — find authentic Filipino restaurants, caterers & bakeries across NZ.',
    cta: 'Find Food & Dining',
    href: '/search?category=food-dining',
    accent: '#FF6B35',
    bg: 'radial-gradient(ellipse at 60% 40%, #2A0E00 0%, #0D0400 60%, #000000 100%)',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Lechon / roast pig silhouette */}
        <ellipse cx="100" cy="130" rx="72" ry="36" fill="#FF6B35" opacity="0.15" />
        <ellipse cx="100" cy="118" rx="58" ry="28" fill="#FF6B35" opacity="0.25" />
        {/* Body */}
        <ellipse cx="100" cy="110" rx="52" ry="24" fill="#FF6B35" opacity="0.5" />
        {/* Head */}
        <ellipse cx="60" cy="108" rx="18" ry="15" fill="#FF6B35" opacity="0.6" />
        {/* Snout */}
        <ellipse cx="48" cy="110" rx="9" ry="7" fill="#FF6B35" opacity="0.7" />
        {/* Eye */}
        <circle cx="56" cy="103" r="3" fill="#000" />
        <circle cx="57" cy="102" r="1" fill="#FF6B35" opacity="0.9" />
        {/* Tail */}
        <path d="M148 108 Q165 95 162 115 Q159 130 148 120" stroke="#FF6B35" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.6" />
        {/* Legs */}
        <rect x="72" y="128" width="10" height="20" rx="5" fill="#FF6B35" opacity="0.5" />
        <rect x="88" y="130" width="10" height="20" rx="5" fill="#FF6B35" opacity="0.5" />
        <rect x="104" y="130" width="10" height="20" rx="5" fill="#FF6B35" opacity="0.5" />
        <rect x="120" y="128" width="10" height="20" rx="5" fill="#FF6B35" opacity="0.5" />
        {/* Spit/stick */}
        <rect x="30" y="107" width="140" height="5" rx="2.5" fill="#A0522D" opacity="0.4" />
        {/* Steam wisps */}
        <path d="M80 80 Q83 70 80 60" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
        <path d="M100 75 Q103 65 100 55" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
        <path d="M120 78 Q123 68 120 58" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: 2,
    label: 'Community',
    title: 'The Jeepney\nof commerce.',
    subtitle: 'BisDak connects the Filipino community in NZ — one business, one kababayan at a time.',
    cta: 'Browse All Businesses',
    href: '/search',
    accent: '#36F4A4',
    bg: 'radial-gradient(ellipse at 40% 50%, #001A0E 0%, #000D07 60%, #000000 100%)',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Jeepney */}
        {/* Body */}
        <rect x="20" y="90" width="155" height="55" rx="8" fill="#36F4A4" opacity="0.18" />
        <rect x="20" y="90" width="155" height="55" rx="8" stroke="#36F4A4" strokeWidth="1.5" opacity="0.35" />
        {/* Roof */}
        <rect x="30" y="72" width="120" height="22" rx="4" fill="#36F4A4" opacity="0.25" />
        {/* Roof rack */}
        <rect x="35" y="68" width="110" height="6" rx="3" fill="#36F4A4" opacity="0.35" />
        {/* Windshield */}
        <rect x="34" y="78" width="48" height="30" rx="3" fill="#36F4A4" fillOpacity="0.12" stroke="#36F4A4" strokeWidth="1" strokeOpacity="0.3" />
        {/* Side windows */}
        <rect x="92" y="95" width="24" height="18" rx="2" fill="#36F4A4" fillOpacity="0.1" stroke="#36F4A4" strokeWidth="1" strokeOpacity="0.25" />
        <rect x="120" y="95" width="24" height="18" rx="2" fill="#36F4A4" fillOpacity="0.1" stroke="#36F4A4" strokeWidth="1" strokeOpacity="0.25" />
        {/* Wheels */}
        <circle cx="55" cy="148" r="16" fill="#102620" stroke="#36F4A4" strokeWidth="2" opacity="0.6" />
        <circle cx="55" cy="148" r="8" fill="#36F4A4" opacity="0.2" />
        <circle cx="145" cy="148" r="16" fill="#102620" stroke="#36F4A4" strokeWidth="2" opacity="0.6" />
        <circle cx="145" cy="148" r="8" fill="#36F4A4" opacity="0.2" />
        {/* Front hood */}
        <path d="M20 110 L20 90 Q20 85 25 85 L82 85 L82 110" fill="#36F4A4" opacity="0.1" />
        {/* Bumper chrome */}
        <rect x="16" y="128" width="12" height="8" rx="2" fill="#36F4A4" opacity="0.4" />
        <rect x="172" y="128" width="12" height="8" rx="2" fill="#36F4A4" opacity="0.4" />
        {/* Decorative stripes */}
        <rect x="20" y="118" width="155" height="4" rx="1" fill="#36F4A4" opacity="0.2" />
        <rect x="20" y="124" width="155" height="2" rx="1" fill="#36F4A4" opacity="0.15" />
        {/* Lights */}
        <circle cx="24" cy="96" r="5" fill="#36F4A4" opacity="0.5" />
        <circle cx="177" cy="96" r="4" fill="#36F4A4" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: 3,
    label: 'Professional Services',
    title: 'Expert Pinoy\nprofessionals.',
    subtitle: 'Accountants, lawyers, immigration advisers — Filipino professionals who understand your journey.',
    cta: 'Find Professional Services',
    href: '/search?category=professional-services',
    accent: '#818CF8',
    bg: 'radial-gradient(ellipse at 50% 30%, #0A0414 0%, #060010 60%, #000000 100%)',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Philippine Eagle head */}
        {/* Body / chest */}
        <ellipse cx="100" cy="145" rx="35" ry="40" fill="#818CF8" opacity="0.15" />
        {/* White chest feathers */}
        <ellipse cx="100" cy="145" rx="22" ry="30" fill="#818CF8" opacity="0.2" />
        {/* Head */}
        <circle cx="100" cy="88" r="28" fill="#818CF8" opacity="0.2" />
        {/* Crest feathers */}
        <path d="M82 68 Q75 48 72 35" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <path d="M88 64 Q84 44 83 30" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <path d="M95 62 Q94 42 95 28" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M102 62 Q103 42 105 28" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <path d="M109 64 Q113 44 117 31" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <path d="M116 68 Q122 50 128 38" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        {/* Eyes */}
        <circle cx="90" cy="85" r="7" fill="#818CF8" opacity="0.35" />
        <circle cx="110" cy="85" r="7" fill="#818CF8" opacity="0.35" />
        <circle cx="90" cy="85" r="4" fill="#000" />
        <circle cx="110" cy="85" r="4" fill="#000" />
        <circle cx="91" cy="84" r="1.5" fill="#818CF8" opacity="0.8" />
        <circle cx="111" cy="84" r="1.5" fill="#818CF8" opacity="0.8" />
        {/* Beak */}
        <path d="M96 94 Q100 105 104 94" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M94 92 L100 100 L106 92" stroke="#818CF8" strokeWidth="2" fill="none" opacity="0.4" />
        {/* Wings hint */}
        <path d="M68 130 Q45 110 38 90" stroke="#818CF8" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.3" />
        <path d="M132 130 Q155 110 162 90" stroke="#818CF8" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 4,
    label: 'Remittance & Travel',
    title: 'Send money home.\nSimple.',
    subtitle: 'Filipino-owned remittance agents, travel agencies, and balikbayan box services across NZ.',
    cta: 'Find Remittance & Travel',
    href: '/search?category=remittance-travel',
    accent: '#FBBF24',
    bg: 'radial-gradient(ellipse at 70% 40%, #150E00 0%, #0A0700 60%, #000000 100%)',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Parol - Filipino Christmas lantern star */}
        {/* Outer star points */}
        <polygon points="100,30 110,75 155,65 118,90 140,130 100,108 60,130 82,90 45,65 90,75"
          fill="#FBBF24" opacity="0.18" stroke="#FBBF24" strokeWidth="1.5" strokeOpacity="0.4" />
        {/* Inner octagon */}
        <polygon points="100,55 117,68 130,85 117,102 100,115 83,102 70,85 83,68"
          fill="#FBBF24" opacity="0.22" />
        {/* Center glow */}
        <circle cx="100" cy="85" r="20" fill="#FBBF24" opacity="0.3" />
        <circle cx="100" cy="85" r="12" fill="#FBBF24" opacity="0.45" />
        <circle cx="100" cy="85" r="6" fill="#FBBF24" opacity="0.7" />
        {/* Dangling tassels */}
        <line x1="88" y1="128" x2="80" y2="170" stroke="#FBBF24" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
        <line x1="94" y1="130" x2="90" y2="172" stroke="#FBBF24" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
        <line x1="100" y1="132" x2="100" y2="174" stroke="#FBBF24" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
        <line x1="106" y1="130" x2="110" y2="172" stroke="#FBBF24" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
        <line x1="112" y1="128" x2="120" y2="170" stroke="#FBBF24" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
        {/* Tassel ends */}
        <circle cx="80" cy="172" r="3" fill="#FBBF24" opacity="0.4" />
        <circle cx="90" cy="174" r="3" fill="#FBBF24" opacity="0.35" />
        <circle cx="100" cy="175" r="3" fill="#FBBF24" opacity="0.4" />
        <circle cx="110" cy="174" r="3" fill="#FBBF24" opacity="0.35" />
        <circle cx="120" cy="172" r="3" fill="#FBBF24" opacity="0.4" />
        {/* Ambient glow rays */}
        <circle cx="100" cy="85" r="40" fill="#FBBF24" opacity="0.05" />
        <circle cx="100" cy="85" r="55" fill="#FBBF24" opacity="0.03" />
      </svg>
    ),
  },
  {
    id: 5,
    label: 'Health & Wellness',
    title: 'Filipino care,\ncloser to home.',
    subtitle: 'Filipino GPs, dentists, nurses, and wellness practitioners across every region of New Zealand.',
    cta: 'Find Health & Wellness',
    href: '/search?category=health-wellness',
    accent: '#34D399',
    bg: 'radial-gradient(ellipse at 30% 60%, #001409 0%, #000A05 60%, #000000 100%)',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Sarimanok - mythical Filipino bird */}
        {/* Tail feathers fan */}
        <path d="M110 130 Q140 160 160 180" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        <path d="M108 132 Q145 155 170 165" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        <path d="M105 133 Q140 148 168 148" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
        <path d="M102 132 Q132 140 158 132" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
        <path d="M108 128 Q135 165 148 185" stroke="#34D399" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        {/* Body */}
        <ellipse cx="90" cy="120" rx="32" ry="22" fill="#34D399" opacity="0.18" transform="rotate(-20 90 120)" />
        {/* Wing */}
        <path d="M72 115 Q50 90 42 65 Q60 80 80 100" fill="#34D399" opacity="0.2" />
        <path d="M72 115 Q48 88 40 60" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M76 110 Q55 88 50 68" stroke="#34D399" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
        {/* Neck + head */}
        <path d="M80 100 Q78 82 84 68" stroke="#34D399" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.4" />
        <circle cx="86" cy="62" r="16" fill="#34D399" opacity="0.22" />
        {/* Crest */}
        <path d="M82 50 Q76 32 70 22" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <path d="M86 48 Q82 30 80 18" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <path d="M90 47 Q90 29 92 18" stroke="#34D399" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M94 48 Q98 30 102 20" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        {/* Eye */}
        <circle cx="92" cy="60" r="5" fill="#34D399" opacity="0.5" />
        <circle cx="92" cy="60" r="3" fill="#000" />
        <circle cx="93" cy="59" r="1.2" fill="#34D399" opacity="0.9" />
        {/* Beak */}
        <path d="M98 64 L108 68 L100 72" fill="#34D399" opacity="0.5" />
        {/* Leg + talon */}
        <path d="M98 138 L98 158 M88 155 L98 158 L106 155" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" />
        {/* Fish in mouth */}
        <ellipse cx="112" cy="68" rx="8" ry="4" fill="#34D399" opacity="0.3" transform="rotate(-15 112 68)" />
        <path d="M119 65 L126 62 L121 68" fill="#34D399" opacity="0.3" />
      </svg>
    ),
  },
]

export default function HeroCarousel() {
  const [i, setI] = useState(0)
  const n = slides.length
  const s = slides[i]
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timer.current) return          // StrictMode guard — skip second mount
    timer.current = setInterval(() => setI(p => (p + 1) % n), 5000)
    return () => {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
    }
  }, [n])

  return (
    <section style={{ position: 'relative', minHeight: '100vh', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>

      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: s.bg, transition: 'background 600ms ease' }} />

      {/* Icon — hidden on mobile to avoid overlap */}
      <div className="hidden sm:block" style={{ position: 'absolute', right: 'clamp(32px, 6vw, 64px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(200px, 34vw, 460px)', height: 'clamp(200px, 34vw, 460px)', opacity: 0.8, pointerEvents: 'none' }}>
        {s.icon}
      </div>

      {/* Text content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1280, width: '100%', margin: '0 auto', padding: 'clamp(72px, 10vh, 120px) clamp(32px, 6vw, 64px) clamp(64px, 8vh, 100px)', boxSizing: 'border-box' }}>
        <p style={{ color: s.accent, fontSize: 12, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 16px' }}>{s.label}</p>
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 84px)', fontWeight: 330, lineHeight: 1.02, color: '#fff', margin: '0 0 20px', maxWidth: 620, whiteSpace: 'pre-line' }}>{s.title}</h1>
        <p style={{ color: '#A1A1AA', fontSize: 'clamp(15px, 2vw, 19px)', margin: '0 0 36px', maxWidth: 460, lineHeight: 1.55 }}>{s.subtitle}</p>
        <a href={s.href} className="btn-primary" style={{ fontSize: 16, padding: '13px 28px' }}>{s.cta} →</a>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, zIndex: 3 }}>
        {slides.map((sl, idx) => (
          <button key={sl.id} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
            style={{ width: idx === i ? 28 : 8, height: 8, borderRadius: 9999, background: idx === i ? s.accent : '#3F3F46', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 300ms ease' }} />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={() => setI((i - 1 + n) % n)} aria-label="Previous"
        style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 3, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9999, width: 44, height: 44, color: '#fff', fontSize: 20, cursor: 'pointer' }}>
        ‹
      </button>
      <button onClick={() => setI((i + 1) % n)} aria-label="Next"
        style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 3, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9999, width: 44, height: 44, color: '#fff', fontSize: 20, cursor: 'pointer' }}>
        ›
      </button>
    </section>
  )
}
