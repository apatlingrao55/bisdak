---
title: "feat: Business card UI + OG image pipeline"
type: feat
status: active
date: 2026-05-09
deepened: 2026-05-09
---

# Business Card UI Enhancement + OG Image Pipeline

## Enhancement Summary

**Deepened on:** 2026-05-09
**Review agents used:** TypeScript Reviewer, Performance Oracle, Security Sentinel, Architecture Strategist, Pattern Recognition Specialist, Frontend Races Reviewer, Code Simplicity Reviewer

### Key Improvements from Research
1. **Centralize business queries** into `lib/db/queries.ts` — eliminates 5-way query duplication
2. **Hash-derived placeholder colors** — zero-maintenance, replaces hand-maintained mapping
3. **Robust error handling** — ShareCardButton try/catch, font loading with retry, image onerror fallback
4. **CLS prevention** — fixed-height image container with explicit dimensions
5. **SSRF protection** — validate photoUrl before passing to Satori
6. **Simplified OG layout** — full-width single-column, handles the common no-photo case better
7. **Simplified to 3 phases** — each produces a testable, user-visible result

### New Considerations Discovered
- OG route must explicitly use Node.js runtime (`readFile` not available on Edge)
- photoUrl could be an SSRF vector — needs URL validation
- Font loading at module level can reject permanently — needs retry wrapper
- Detail page `getBiz()` has a pre-existing bug: no `status = 'active'` filter

---

## Overview

Add storefront photos (with category-based placeholders) and contact details to BusinessCard components, and create a shareable OG image endpoint via `next/og` (Satori) that generates branded 1200x630 PNG cards per business.

## Problem Statement / Motivation

- BusinessCards are text-only — no visual differentiation between businesses
- No OG images for social sharing — shared links show no preview image
- Contact details (phone, email, website) only visible after clicking into the detail page
- Most businesses lack `photoUrl`, so a placeholder system is needed

## Proposed Solution

Two deliverables sharing the same visual language:

1. **Enhanced BusinessCard component** — photo/placeholder at top, display-only contact details, mobile-first stacking layout
2. **OG image endpoint** (`/api/og/[slug]`) — branded PNG with business info, served as OG meta and shareable via button

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Contact details on card | Display-only text (not clickable) | Card is wrapped in a `<Link>` — nested interactive elements are invalid HTML |
| Placeholder when no photo | Hash-derived HSL gradient + category emoji | Zero maintenance, auto-works for new categories, uses existing `categories.icon` emoji |
| OG image library | `next/og` (bundled with Next.js 16) | No install needed, import from `next/og`, JSX-based |
| Font in OG image | Inter SemiBold only (single weight for v1) | Matches site branding; two weights imperceptible at social preview thumbnail size |
| Card photo element | Plain `<img>` with `loading="lazy"` + explicit dimensions | Codebase doesn't use `next/image`; explicit height prevents CLS |
| OG caching | `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200` | Protects against crawler storms; SWR avoids latency spikes on cache expiry |
| Share button behavior | Mobile: Web Share API; Desktop: copy link to clipboard | Simple, no PNG download complexity for v1; OG image auto-appears when link is shared |
| OG for missing/pending businesses | 404 response | Don't generate images for non-existent or non-active businesses |
| Long business names | Truncate with ellipsis in OG image | Fixed 1200x630 canvas can't accommodate unbounded text |
| openStatus in OG image | Omitted | Time-sensitive data shouldn't be baked into cached images |
| facebookUrl/googleMapsUrl on card | Excluded | Too dense; already on detail page |
| generateMetadata update | Always use `/api/og/${slug}`, twitter card `summary_large_image` | Consistent branded previews |
| OG layout | Full-width single column (not 40/60 split) | Most businesses lack photos; single column handles placeholder case better |
| Business queries | Centralized in `lib/db/queries.ts` | Eliminates duplication across homepage, search, detail, API, and OG endpoint |
| OG runtime | Node.js (explicit `export const runtime = 'nodejs'`) | `readFile` not available on Edge runtime |

## Technical Considerations

- **Satori CSS constraints**: Only `display: flex` (no grid), inline styles only, no `calc()`. The codebase already uses inline styles so this aligns well.
- **Font loading**: Satori requires TTF/OTF `ArrayBuffer`. Download Inter SemiBold (600) TTF into `assets/fonts/`. Load via lazy-init function with retry on failure.
- **External images in OG**: If `photoUrl` exists, pre-fetch with `AbortSignal.timeout(3000)` and convert to base64 data URL. Fall back to placeholder on failure. Validate URL against HTTPS-only allowlist to prevent SSRF.
- **Bundle size**: Satori has a 500KB limit per response. Font (~200KB) loaded at runtime via `readFile`, not bundled. External images fetched at runtime.
- **CLS prevention**: Card image container uses fixed `height: 160px` with `overflow: hidden`. Image has explicit `width`/`height` attributes. Broken images fall back to placeholder via `onerror`.

---

## Implementation Plan

### Phase 1: Centralized queries + Enhanced BusinessCard

**Pre-requisite: Extract shared data access layer**

**Files to create:**
- `lib/db/queries.ts` — centralized business query functions

```ts
// lib/db/queries.ts
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, avg, count, and } from 'drizzle-orm'

/** Full business by slug — used by detail page, API route, OG endpoint */
export async function getBusinessBySlug(slug: string) {
  const [biz] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      phone: businesses.phone,
      email: businesses.email,
      website: businesses.website,
      facebookUrl: businesses.facebookUrl,
      googleMapsUrl: businesses.googleMapsUrl,
      isFilipino: businesses.isFilipino,
      photoUrl: businesses.photoUrl,
      openStatus: businesses.openStatus,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryIcon: categories.icon,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(and(eq(businesses.slug, slug), eq(businesses.status, 'active')))
    .limit(1)
  return biz ?? null
}

/** Card-shaped projection with aggregates — used by homepage, search */
export async function getBusinessCards(options?: { limit?: number }) {
  // ... existing query pattern with photoUrl, phone, email, website added
}
```

> **Research insight (Architecture):** The codebase currently duplicates business queries in 4 places (homepage, search, detail page, API route). Adding the OG endpoint makes 5. Centralizing eliminates drift and adds the missing `status = 'active'` filter that the detail page currently lacks.

**Files to modify:**
- `components/BusinessCard.tsx` — add photo/placeholder, contact details, responsive layout
- `app/page.tsx` — use `getBusinessCards()` from queries module
- `app/search/page.tsx` — use `getBusinessCards()` from queries module
- `app/business/[slug]/page.tsx` — use `getBusinessBySlug()` from queries module
- `app/api/businesses/[slug]/route.ts` — use `getBusinessBySlug()` from queries module

**Placeholder color — hash-derived, zero maintenance:**

```ts
// Inline utility in BusinessCard.tsx (or lib/db/queries.ts if shared with OG)
function getCategoryColor(name?: string | null): string {
  if (!name) return '#1E2C31'
  let hash = 0
  for (const ch of name) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`
}
```

> **Research insight (Simplicity):** A hand-maintained `CATEGORY_COLORS` mapping is a YAGNI violation — it requires manual updates when categories change. A 5-line hash-to-hue function works for any category automatically.

**BusinessCard layout (top to bottom):**

```
+----------------------------------+
|  [Photo / Placeholder gradient]  |   <- 160px fixed height, overflow hidden
|  with category emoji centered    |
+----------------------------------+
|  Name          Filipino badge    |
|  Category  -  Region             |
|  Description (2-line clamp)      |
|  Phone | Email | Website (text)  |
|  Stars (rating) | Open/Closed    |
+----------------------------------+
```

**Image container with CLS prevention and error fallback:**

```tsx
{/* Fixed-height container — no layout shift */}
<div style={{
  width: '100%',
  height: '160px',
  borderRadius: '12px 12px 0 0',
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
        target.parentElement!.style.background = getCategoryColor(business.categoryName)
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
```

> **Research insight (Frontend Races):** Without explicit dimensions, lazy-loaded images cause CLS. A fixed `height: 160px` container with `onerror` fallback to the placeholder gradient prevents both layout shift and broken image icons.

**Updated type interface:**

```ts
type Business = {
  id: string
  name: string
  slug: string
  description: string | null
  isFilipino: boolean | null
  categoryName: string | null     // required | null (always returned from JOIN)
  categoryIcon: string | null     // for placeholder emoji
  regionName: string | null
  avgRating: number               // default 0 at query layer
  reviewCount: number             // default 0 at query layer
  openStatus: string | null
  photoUrl: string | null
  phone: string | null
  email: string | null
  website: string | null
}
```

> **Research insight (TypeScript):** Use `required | null` instead of `optional | null` for joined fields — `optional` means "field may not exist on the object" (data-shape question), `null` means "field exists but has no value" (domain question). Push defaults to the query layer. `avgRating` and `reviewCount` become required `number` (defaulting to `0`).

**Contact details rendering:** Display-only text (no links), truncated with ellipsis. Use muted color (`#71717A`), small font (`13px`). Use `📞`, `✉️`, `🌐` emoji prefixes to match the existing button pattern on the detail page.

**Verification:**
- Visual check on mobile (320px) and desktop
- Card should not exceed ~400px height
- Broken `photoUrl` gracefully shows placeholder
- No CLS when images load (check with Chrome DevTools Layout Shift Regions)

---

### Phase 2: OG image endpoint

**Files to create:**
- `assets/fonts/Inter-SemiBold.ttf` — download from Google Fonts
- `app/api/og/[slug]/route.tsx` — OG image generation endpoint

**Font loading with retry on failure:**

```tsx
// app/api/og/[slug]/route.tsx
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getBusinessBySlug } from '@/lib/db/queries'

export const runtime = 'nodejs'

let fontCache: Buffer | null = null

async function loadFont(): Promise<Buffer> {
  if (fontCache) return fontCache
  const data = await readFile(join(process.cwd(), 'assets/fonts/Inter-SemiBold.ttf'))
  fontCache = data
  return data
}

type Params = Promise<{ slug: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const { slug } = await params

  // Validate slug format
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
            <span style={{ fontSize: '42px', fontWeight: 600, lineClamp: 1 }}>
              {biz.name.length > 40 ? biz.name.slice(0, 40) + '...' : biz.name}
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
            {biz.phone && <span>📞 {biz.phone}</span>}
            {biz.email && <span>✉️ {biz.email}</span>}
            {biz.website && <span>🌐 {new URL(biz.website).hostname}</span>}
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
```

> **Research insight (Security):** photoUrl could be an SSRF vector — an attacker-controlled URL like `http://169.254.169.254/...` would be fetched from the server. Validate HTTPS-only and pre-fetch with a 3-second timeout. Convert to base64 data URL before passing to Satori.

> **Research insight (Performance):** Add `stale-while-revalidate=43200` so when the 24h CDN cache expires, users get a stale response while revalidation happens in the background. Eliminates latency spikes.

> **Research insight (Frontend Races):** Module-level `readFile` promises reject permanently on failure — a single missing font file poisons every subsequent request. Use a lazy-init function with `fontCache = null` on failure to allow retries.

**OG image layout (full-width, single column):**

```
+------------------------------------------------------+
| [Photo banner or gradient+emoji placeholder, 220px]  |
+------------------------------------------------------+
|  Business Name                  Filipino-owned badge  |
|  Category  -  📍 Region                              |
|  📞 Phone  |  ✉️ Email  |  🌐 website.com           |
+------------------------------------------------------+
|  bisdak.co.nz                Pinoy Business Hub NZ   |
+------------------------------------------------------+
```

> **Research insight (Simplicity):** A 40/60 split layout over-designs for the photo-present case when most businesses lack photos. A full-width single-column layout is simpler in Satori, handles the placeholder case gracefully, and has fewer edge cases.

**Verification:**
- Hit `/api/og/test-slug` in browser — verify PNG renders
- Test with: all fields present, no contact fields, no photo, very long name
- Verify 404 for non-existent and non-active businesses
- Verify cache headers in response

---

### Phase 3: Share button + OG meta integration

**Files to modify:**
- `app/business/[slug]/page.tsx` — add Share button, update `generateMetadata`

**Files to create:**
- `components/ShareButton.tsx` — client component

**generateMetadata changes:**

```ts
openGraph: {
  title,
  description,
  url: `${BASE}/business/${slug}`,
  type: 'website',
  images: [{ url: `${BASE}/api/og/${slug}`, width: 1200, height: 630, alt: biz.name }],
},
twitter: { card: 'summary_large_image', title, description },
```

**ShareButton with proper error handling:**

```tsx
// components/ShareButton.tsx
'use client'
import { useState } from 'react'

export default function ShareButton({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://bisdak.co.nz/business/${slug}`

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on BisDak`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      // User cancelled the share sheet — not an error
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Clipboard fallback if share fails
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Silently fail — no clipboard access
      }
    }
  }

  return (
    <button onClick={handleShare} className="btn-ghost"
      style={{ fontSize: '15px', padding: '10px 20px' }}>
      {copied ? '✓ Copied!' : '📤 Share'}
    </button>
  )
}
```

> **Research insight (TypeScript + Frontend Races):** `navigator.share` throws `AbortError` on user cancellation — this is the primary exit path, not an edge case. Without try/catch, every cancelled share produces an unhandled promise rejection. The `AbortError` case is explicitly swallowed with a comment explaining why.

> **Research insight (Simplicity):** For v1, "Copy Link" on desktop is simpler and more useful than "Download PNG". The OG image auto-appears when the copied link is pasted into social media. PNG download can be added later if users request it.

> **Research insight (Pattern Consistency):** Add `📤` emoji prefix to match the existing button pattern on the detail page (📞, 🌐, ✉️, 📘, 📍).

**Also update the detail page to use centralized query:**

```ts
// Replace inline getBiz() with:
import { getBusinessBySlug } from '@/lib/db/queries'
```

**Verification:**
- Test share on mobile — should trigger native share sheet
- Test on desktop — should copy URL and show "Copied!" feedback
- Cancel the share sheet on mobile — should not throw errors
- Verify OG preview: Facebook Sharing Debugger, Twitter Card Validator
- Verify `summary_large_image` card renders the full 1200x630 image

---

## Acceptance Criteria

- [ ] Business queries centralized in `lib/db/queries.ts`
- [ ] Detail page filters by `status = 'active'` (fixes pre-existing bug)
- [ ] BusinessCard shows photo or category placeholder (hash-derived gradient + emoji) at top
- [ ] BusinessCard image container is fixed 160px height (no CLS)
- [ ] BusinessCard image has `onerror` fallback to placeholder
- [ ] BusinessCard displays phone, email, website as display-only text
- [ ] BusinessCard layout stacks vertically and fits mobile (320px+)
- [ ] `/api/og/[slug]` returns a 1200x630 PNG with business details
- [ ] OG endpoint explicitly declares `runtime = 'nodejs'`
- [ ] OG endpoint validates slug format before DB query
- [ ] OG endpoint validates photoUrl is HTTPS before fetching (SSRF protection)
- [ ] OG endpoint pre-fetches images with 3s timeout, falls back to placeholder
- [ ] OG image includes: name, category, region, phone, email, website, Filipino badge, photo/placeholder, "bisdak.co.nz" watermark
- [ ] OG image returns 404 for non-existent or non-active businesses
- [ ] OG image has cache headers (`s-maxage=86400, stale-while-revalidate=43200`)
- [ ] OG image handles missing fields gracefully (flex collapse)
- [ ] OG image uses Inter SemiBold font
- [ ] OG font loading has retry mechanism (not permanently rejected promise)
- [ ] Detail page `generateMetadata` uses `/api/og/[slug]` as OG image
- [ ] Detail page twitter card is `summary_large_image`
- [ ] Share button — native share on mobile, copy link on desktop
- [ ] Share button handles `AbortError` gracefully (no unhandled rejections)
- [ ] Share button shows "Copied!" feedback on desktop

## Success Metrics

- Every active business has a branded OG image (even without a photo)
- Social shares of business pages show a rich preview card
- BusinessCards on homepage/search are more visually engaging
- Zero CLS from card image loading
- OG endpoint responds under 500ms (warm cache)

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Satori fails on external `photoUrl` fetch | Pre-fetch with 3s timeout; fall back to placeholder |
| photoUrl points to internal/malicious URL (SSRF) | Validate HTTPS-only before fetching |
| Inter TTF file adds ~200KB to repo | Acceptable; loaded once per cold start, cached in memory |
| OG endpoint latency under load | `s-maxage=86400` + `stale-while-revalidate`; Vercel edge cache absorbs repeat requests |
| Card height increases with new fields | Fixed 160px image + small (13px) contact text |
| Font file missing/corrupted on deploy | Lazy-init with retry (not permanently rejected promise) |
| Long business names overflow OG canvas | Truncate at 40 chars with ellipsis |
| Query duplication drift | Centralized in `lib/db/queries.ts` — single source of truth |

## Security Considerations

> **From Security Sentinel review** — these apply specifically to this feature:

| Concern | Status | Action |
|---------|--------|--------|
| SSRF via photoUrl in OG endpoint | Addressed in plan | Validate HTTPS-only, pre-fetch with timeout |
| PII (phone/email) in OG images | Accepted risk | Business contact details are already public on the detail page |
| Slug enumeration on OG endpoint | Low risk | CDN cache prevents resource abuse; slugs are already guessable |
| Slug input validation | Addressed in plan | Regex validation before DB query |
| Cache poisoning via data modification | Low risk | 24h TTL is acceptable for business listings |

> **Note:** The Security Sentinel also found several pre-existing vulnerabilities in the codebase (blog XSS, admin auth timing attack, CSRF on POST endpoints, open redirect via Referer). These should be tracked separately but are not blockers for this feature.

## References & Research

- **Brainstorm**: `docs/brainstorms/2026-05-09-business-card-pipeline-brainstorm.md`
- **Existing card**: `components/BusinessCard.tsx`
- **Detail page**: `app/business/[slug]/page.tsx`
- **Schema**: `lib/db/schema.ts:24-42` (businesses table)
- **Design tokens**: `app/globals.css` (@theme section)
- **Next.js OG docs**: https://nextjs.org/docs/app/api-reference/functions/image-response
- **Satori CSS support**: https://github.com/vercel/satori (only flex, inline styles, no grid/calc)
- **Satori limitations**: No `display: grid`, no `calc()`, no WOFF2 fonts, only 2D transforms
- **ImageResponse import**: `next/og` (not `@vercel/og` — bundled with Next.js 16+)

### Review Agent Findings (Archived)

<details>
<summary>TypeScript Reviewer — 7 findings (2 critical, 2 high)</summary>

- CRITICAL: Unhandled promise rejection in ShareCardButton → fixed with try/catch
- HIGH: Font loading no error recovery → fixed with lazy-init retry
- HIGH: Business type mixes entity and view model → addressed with required fields at query layer
- MEDIUM: No slug validation → added regex validation
- LOW: Use `satisfies` for category colors → replaced with hash function (no mapping needed)
</details>

<details>
<summary>Performance Oracle — 7 recommendations</summary>

- Add `stale-while-revalidate` → added to cache headers
- Explicit `runtime = 'nodejs'` → added to plan
- Fixed image dimensions for CLS → added to card container
- Photo timeout + fallback → pre-fetch with AbortSignal.timeout(3000)
- Memory per OG request ~5-8MB → acceptable for Vercel serverless
- Query expansion negligible impact → confirmed
</details>

<details>
<summary>Architecture Strategist — centralize queries (critical)</summary>

- Extract `lib/db/queries.ts` with `getBusinessBySlug()` and `getBusinessCards()` → incorporated as Phase 1 pre-requisite
- Add `status = 'active'` filter (pre-existing bug) → fixed in centralized query
- DRY violation: 5 query consumers → resolved
</details>

<details>
<summary>Security Sentinel — SSRF + PII concerns</summary>

- H1: SSRF via photoUrl → validate HTTPS-only, pre-fetch with timeout
- H5: PII in OG images → accepted (already public on detail page)
- M3: Slug validation → added regex check
- Also found pre-existing: blog XSS, admin auth issues, CSRF, open redirect (track separately)
</details>

<details>
<summary>Frontend Races — 4 items for this feature</summary>

- ShareCardButton unhandled rejection → fixed with try/catch + AbortError handling
- Card images CLS + no onerror → fixed with 160px container + onerror fallback
- Font loading permanently rejected → fixed with lazy-init retry
- Add busy/loading state to share button → addressed with "Copied!" feedback
</details>

<details>
<summary>Code Simplicity — 5 simplifications adopted</summary>

- Hash-derived colors (no CATEGORY_COLORS mapping) → adopted
- Single font weight for v1 → adopted
- Full-width OG layout → adopted
- Copy link instead of PNG download → adopted
- 3 phases instead of 4 → adopted
</details>

<details>
<summary>Pattern Consistency — all consistent, 3 minor notes</summary>

- Add emoji prefix to share button → adopted (📤)
- assets/ directory is new convention → documented
- lib/ placement acceptable for single utility → noted
</details>
