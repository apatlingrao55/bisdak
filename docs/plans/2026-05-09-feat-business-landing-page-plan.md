---
title: "feat: Business detail page — one-page advert redesign"
type: feat
status: active
date: 2026-05-09
---

# Business Detail Page — One-Page Advert Redesign

## Overview

Redesign `/business/[slug]` from a directory listing into a full-bleed one-page landing page. Each section takes the full viewport width. The page flows: hero photo -> about -> contact buttons -> embedded map -> reviews.

## Acceptance Criteria

- [ ] Full-width hero banner using business photo (or category placeholder)
- [ ] Business name, badges, and open status overlaid on hero with gradient
- [ ] About section with description in large centered text
- [ ] Contact strip with big tappable buttons (phone, email, website, Facebook, Maps, share, claim)
- [ ] Embedded Google Maps iframe when googleMapsUrl is available
- [ ] Reviews section preserved (form + list) with same functionality
- [ ] Mobile responsive — everything stacks naturally
- [ ] JSON-LD and metadata unchanged
- [ ] No new database fields needed

## Implementation — `app/business/[slug]/page.tsx`

### Section 1: Hero Banner

```tsx
{/* Full-width hero */}
<section style={{
  position: 'relative',
  width: '100%',
  height: 'clamp(280px, 50vw, 420px)',
  overflow: 'hidden',
  background: photoUrl ? '#1E2C31' : getCategoryColor(categoryName),
}}>
  {photoUrl && <img src={photoUrl} ... style={{ objectFit: 'cover', width: '100%', height: '100%' }} />}
  {/* Gradient overlay for text readability */}
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }} />
  {/* Overlaid text */}
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px clamp(24px,5vw,64px)' }}>
    <badges />
    <h1>{name}</h1>
    <open status />
  </div>
</section>
```

### Section 2: About

```tsx
<section style={{ background: '#02090A', padding: '48px 24px', textAlign: 'center' }}>
  <p style={{ fontSize: '20px', lineHeight: 1.7, maxWidth: '720px', margin: '0 auto' }}>
    {description}
  </p>
</section>
```

### Section 3: Contact Strip

```tsx
<section style={{ background: '#061A1C', padding: '32px 24px' }}>
  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px', margin: '0 auto' }}>
    {/* phone, email, website, facebook, maps, share, claim buttons */}
  </div>
</section>
```

### Section 4: Embedded Map

Extract a search query from `googleMapsUrl` and embed via iframe:

```tsx
{googleMapsUrl && (
  <section style={{ width: '100%', height: '350px' }}>
    <iframe
      src={`https://maps.google.com/maps?q=${encodeURIComponent(extractQuery(googleMapsUrl))}&output=embed`}
      width="100%" height="100%"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  </section>
)}
```

Helper to extract place name from various Google Maps URL formats:
- `https://maps.google.com/?q=...`
- `https://www.google.com/maps/place/...`
- `https://goo.gl/maps/...` (fallback to business name + region)

### Section 5: Reviews

Same as current — review form + review list. Just update the section container to be full-bleed with centered content.

## Files Changed

| File | Change |
|------|--------|
| `app/business/[slug]/page.tsx` | Complete layout redesign |
| `lib/maps.ts` | New — helper to extract Google Maps query from URL |

## References

- Brainstorm: `docs/brainstorms/2026-05-09-business-landing-page-brainstorm.md`
- Current page: `app/business/[slug]/page.tsx`
- Category colors: `lib/category-color.ts`
