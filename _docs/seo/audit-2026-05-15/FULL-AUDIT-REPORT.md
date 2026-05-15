# BisDak SEO Audit — Full Report

**Site:** https://bisdak.co.nz/
**Audited:** 2026-05-15
**Stack:** Next.js (App Router) on Vercel
**Business type:** Directory (hybrid: local-business directory + publisher blog + free utility tools), serving the Filipino community in New Zealand

---

## Executive Summary

**Overall SEO Health Score: 40 / 100** — Major remediation required.

BisDak has the bones of a solid product — a real niche (Filipino-owned NZ businesses), real depth (1,272 listings, 9 long-form blog posts, 6 working calculators), correct HTTPS+HSTS, a valid sitemap, and the right schema *type* on business pages. But the site is bleeding ranking and citation potential because of a small number of high-leverage bugs:

1. **Every non-business page declares the homepage as its canonical URL.** Blog posts, tool pages, /search, /jobs, /tools index — all canonical to `https://bisdak.co.nz`. Google will treat them as duplicates of the homepage and refuse to index them. This single bug, on its own, neutralises the entire blog and tools surface.
2. **/search and /jobs return HTTP 403** to anonymous visitors (including Googlebot). They are in the sitemap with priorities 0.9 and 0.8. The 403 sets auth cookies — the routes are protected by NextAuth middleware that's leaking onto public routes.
3. **Business listing pages render only ~104 words of static HTML** out of an apparent full page. The rest is in a React serialized payload inside `<script>` tags that AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) cannot read. The directory — the product's core asset — is functionally invisible to AI search.
4. **1,272 listing pages share an identical thin template.** Each carries ~15–25 unique words and a stub LocalBusiness schema with no phone, address, hours, geo, or reviews. This is well past the "site reputation abuse / scaled content" threshold Google publicly polices.
5. **404 pages emit two conflicting `<meta name="robots">` tags** — `noindex` (from the 404 handler) and `index, follow` (leaked from the root layout). Same root-layout leak is causing the canonical collapse.

The good news: the four largest issues all trace to two or three files in the Next.js metadata layer plus the business-page rendering strategy. A focused 2–3 sprint effort can lift the Health Score into the 65–75 range.

### Top 5 Critical Issues

| # | Issue | Pages affected | Fix in |
|---|---|---|---|
| 1 | Canonical collapse — non-business pages canonical to `/` | ~21+ (all blog, tools, search, jobs, root sections) | `app/layout.tsx` metadata |
| 2 | `/search` and `/jobs` return 403 to Googlebot | 2 (in sitemap with prio 0.9 / 0.8) | `middleware.ts` matcher |
| 3 | Business pages render only 104 words server-side | 1,272 | `app/business/[slug]/page.tsx` |
| 4 | LocalBusiness schema missing 17 of 20+ fields | 1,272 | schema generator |
| 5 | 404 pages emit duplicate robots meta + leak homepage canonical | every 404 | `app/layout.tsx` + `app/not-found.tsx` |

### Top 5 Quick Wins (low effort, high impact)

| # | Quick win | Effort | Why |
|---|---|---|---|
| 1 | Move `alternates.canonical` out of root layout; let each page set its own | ~1 hour | Fixes Critical #1 across the site |
| 2 | Tighten `middleware.ts` matcher so it doesn't run on `/search`, `/jobs`, `/blog`, `/tools`, `/business` | ~1 hour | Fixes Critical #2 |
| 3 | Publish `/llms.txt` (draft below) | ~30 min | AI search ground-truth in one file |
| 4 | Add `Organization` + `WebSite` (with `SearchAction`) JSON-LD to root layout | ~1 hour | Unlocks Knowledge Graph + Sitelinks Searchbox |
| 5 | Add 5 security headers in `next.config.ts` | ~30 min | Trust + DevTools/PSI compliance |

---

## Category Scores

| Category | Weight | Score | Justification |
|---|---|---|---|
| Technical SEO | 22% | **54 / 100** | HTTPS, HSTS, robots.txt, sitemap structure correct. Undermined by canonical collapse, 403 on /search and /jobs, 200 on /admin, duplicate 404 robots meta, 4s cold LCP from autoplay hero video, 5 missing security headers. |
| Content Quality | 23% | **38 / 100** | Blog posts are 3,000+ words and substantive. Directory is 1,272 near-duplicate thin pages (~15–25 unique words each). No /about, /contact, /authors. Author attributed to Organization, not Person. |
| On-Page SEO | 20% | **45 / 100** | Titles unique on tools and business; blog titles double-brand the site name; canonical broken on majority of pages; meta descriptions OK on samples; H1 missing in initial HTML on / and business pages. |
| Schema / Structured Data | 10% | **12 / 100** | LocalBusiness schema exists but covers ~15% of fields; wrong `@type` (generic LocalBusiness instead of Restaurant/Bakery/FinancialService etc.) on every listing; no Organization, WebSite/SearchAction, BreadcrumbList, ItemList, WebApplication anywhere. |
| Performance (CWV) | 10% | **35 / 100** | Cold-load 4.04s for 57 KB HTML on /; autoplay `jeepney2.mp4` background video with no `preload="none"` or poster; 10 JS chunks; no field data (no GSC/CrUX hookup). Lab-only estimate. |
| AI Search Readiness | 10% | **31 / 100** | All AI bots allowed; blog posts server-rendered; but no llms.txt; 1,272 business pages near-empty for non-JS crawlers; zero external brand authority (no Wikipedia, no Reddit, no Trustpilot, no notable backlinks). |
| Images | 5% | **50 / 100** | OG image per page via `/api/og/[slug]` (good); no in-content image audit possible without rendering; no `loading="lazy"` audit. |

**Weighted SEO Health Score: 40 / 100**

---

## Technical SEO

### ✅ Working
- HTTPS enforced; HSTS `max-age=63072000` (2 years).
- robots.txt allows all bots, correctly disallows `/admin`, `/dashboard`, `/api/`, declares sitemap.
- Sitemap at `/sitemap.xml` is valid XML, 1,293 well-formed URLs (the earlier double-slash report was a parsing artefact on my side — confirmed clean).
- Trailing-slash policy: `/blog/` → 308 → `/blog` consistently.
- Mobile viewport and `theme-color` set globally.
- Business pages carry correct self-referencing canonical (the only page type that does).
- 404s return HTTP 404 (not soft 404).

### 🚨 Critical

**C-T1 — Canonical collapse on non-business pages.** Observed across `/`, `/blog/welcome-to-bisdak`, `/tools/mortgage`, `/search`, `/jobs`:
```html
<link rel="canonical" href="https://bisdak.co.nz"/>
```
The root layout's `metadata.alternates.canonical` is being inherited by every route group except `/business/[slug]` (which overrides it). Until fixed, Google will consolidate blog posts and tool pages into the homepage and not index them as standalone URLs.

**C-T2 — /search and /jobs return HTTP 403.** Confirmed:
```
GET /search → 403   Set-Cookie: __Host-authjs.csrf-token=...
GET /jobs   → 403   Set-Cookie: __Host-authjs.csrf-token=...
```
NextAuth middleware is intercepting these routes. They are in the sitemap (priority 0.9 and 0.8) and reachable from main navigation. Googlebot will deindex them within days.

**C-T3 — Homepage cold-load 4.04 s for 57 KB HTML.** `x-vercel-cache: MISS` paths are slow because the hero loads `jeepney2.mp4` (Supabase Storage) with no `poster`, no `preload="none"`, no fallback. LCP is almost certainly this video. Warm-edge requests are faster but Googlebot's mobile crawl frequently hits cold.

**C-T4 — Duplicate robots meta on 404 pages.** Confirmed on `/this-does-not-exist`:
```html
<meta name="robots" content="noindex"/>            ← from not-found
<meta name="robots" content="index, follow"/>      ← leaked from root layout
```
Plus the 404 page leaks the homepage canonical, OG image, and title. The 404 status is correct, but the metadata leakage wastes crawl budget interpretation.

### ⚠️ Warnings
- **/admin returns HTTP 200** to anonymous requests (not 401/404). robots.txt blocks it but some crawlers ignore robots.txt. Verify the page itself doesn't reveal sensitive UI.
- **/dashboard returns 307 → 404** dead-end. Should be 401 or redirect to sign-in.
- **Blog post titles double-brand:** `Welcome to BisDak — New Zealand's Pinoy Business Hub — BisDak — BisDak NZ`. Caused by `title.template` appending "— BisDak NZ" to titles that already contain "BisDak".
- **5 security response headers absent** site-wide: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.
- **Uniform sitemap `lastmod`** (2026-05-13T15:38:59.156Z on every URL). Derive per-page modification dates from `business.updated_at` / `post.published_at`.
- **Sitemap priority inflated** — 0.8 on 1,272 business pages dilutes the signal. Drop business pages to 0.5–0.6, keep home at 1.0, blog at 0.7, top-level browse at 0.9.

---

## Content Quality / E-E-A-T

### 🚨 Critical
**Directory thin content at scale.** 1,272 `/business/*` pages measured at 337–352 total words each, ~200 of which is shared chrome (nav, review form labels, footer). Unique content per page: roughly **15–25 words**. The pages share an identical template suffix in the description meta: *"Filipino-owned business in [region] listed on BisDak."* Zero reviews exist on any sampled listing. This pattern is the exact one Google's "site reputation abuse" / scaled content guidance targets — and 1,272 pages is far past the 50-page hard-stop threshold the SEO quality gates recommend without explicit content-uniqueness justification.

### ⚠️ Warnings
- **Author = "BisDak Team" (Organization), not Person.** All blog posts. For immigration content (INZ visa upgrade, AEWV, caregiver jobs) this is YMYL-adjacent and Google's QRG wants identifiable human expertise.
- **No `/about`, `/team`, `/contact`, `/authors`** (all return 404). These are foundational trust signals.
- **Blog index title double-brands**: `News & Stories — BisDak Pinoy Business Hub NZ — BisDak NZ`. Same root cause as the post-title issue.

### ✅ What's working
- Tool pages (`/tools/mortgage`, `/tools/paye`, `/tools/gst`) have clean, descriptive titles and accurate meta descriptions.
- Blog posts are content-dense (3,360 and 3,886 words on the two samples) and contain community-aware writing — not raw LLM boilerplate.
- Blog content links to authoritative sources: `immigration.govt.nz`, `iaa.govt.nz`, `philembassy.org.nz`.
- `/privacy` and `/terms` exist with a real effective date.
- Meta descriptions are unique across the 5 sampled business pages.

### E-E-A-T breakdown
| Pillar | / 25 (or noted) | Notes |
|---|---|---|
| Experience | 12 / 20 | Blog shows some community voice; directory pages show none |
| Expertise | 14 / 25 | Blog is substantive; no named authors, no credentials |
| Authoritativeness | 8 / 25 | No about/team page; no press mentions; no Wikipedia entity |
| Trustworthiness | 10 / 30 | Privacy + Terms present; no contact, no address, no listing verification process |

---

## Schema / Structured Data

### Current inventory
| Page | `@type` present | Field coverage |
|---|---|---|
| `/` | **none** | 0% |
| `/business/[slug]` (×1,272) | `LocalBusiness` (generic) | ~15% — name, description, url, partial address only |
| `/blog` (index) | none | 0% |
| `/blog/[slug]` (×9) | `BlogPosting` | ~45% — missing `image`, `dateModified`, `mainEntityOfPage` |
| `/tools` and `/tools/*` (×6) | none | 0% |
| `/search`, `/jobs` | none | 0% |

### 🚨 Critical schema gaps
1. **Wrong `@type` on every business page.** Jollibee should be `Restaurant`, Manila Bakeshop `Bakery`, Pinoy Remittance Hamilton `FinancialService`, Aling Rosa Catering `FoodEstablishment`/`Caterer`. Subtypes unlock the type-specific rich results Google ships.
2. **Missing fields on every business page:** `telephone`, `geo` (lat/lng), `address.streetAddress`, `address.addressLocality`, `address.postalCode`, `openingHoursSpecification`, `image`, `priceRange`, `sameAs`, `hasMap`, `areaServed`, `aggregateRating`, `@id`.
3. **Homepage has zero schema.** No `Organization`, no `WebSite` with `SearchAction` → no Knowledge Graph anchor, no Sitelinks Searchbox eligibility.
4. **Canonical bug compounds schema bug.** Blog post schema's `url` field correctly names the post URL, but the HTML canonical points to homepage — Google trusts the canonical and ignores the schema URL.
5. **No BreadcrumbList anywhere.** Lost SERP enhancement.

(Full JSON-LD snippets — Organization, WebSite/SearchAction, Restaurant, BlogPosting, WebApplication, BreadcrumbList — are in `ACTION-PLAN.md`.)

---

## Performance (CWV — lab estimate only)

- Cold homepage HTML download: 4.04 s for 57 KB. Vercel CDN MISS on edge.
- `jeepney2.mp4` autoplay video loads with no `preload="none"`, no `poster`, no `loading="lazy"`. Likely LCP element on mobile.
- 10 Next.js JS chunks loaded as `async`.
- No GSC / CrUX field data available — recommend connecting (`/seo google connect`) for real LCP/INP/CLS by URL group.

(Without a Playwright run no exact LCP/INP/CLS figures are produced here. The 4 s cold total-time is the floor.)

---

## AI Search Readiness (GEO)

**Score: 31 / 100.**

| Platform | Score | Primary blocker |
|---|---|---|
| Google AI Overviews | 22 | Org-only author on YMYL immigration content; empty business pages |
| ChatGPT | 35 | Blog citable; directory invisible; no external signals |
| Perplexity | 38 | .nz authority + gov links help; no anchor IDs; no `dateModified` |
| Bing Copilot | 30 | Schema present but thin |
| Claude | 40 | Best blog clarity; directory invisible; no llms.txt |

**Why it's so low** — three compounding issues:
1. The 1,272 business pages — the *product* — render ~104 visible words server-side. The rest is in `__RSC_PAYLOAD__` JSON inside `<script>` tags that no AI crawler will execute. AI models build a wrong mental model of BisDak (as a "blog about NZ Filipino life" rather than "NZ's Filipino business directory") because the blog is what they can actually read.
2. No `/llms.txt` (returns 404). No machine-readable ground truth.
3. Zero external brand authority. AI citation engines weight co-mention signals heavily; bisdak.co.nz has no Wikipedia entity, no Reddit mentions, no Trustpilot profile, no notable backlinks. Even with perfect on-page content the AI engines wouldn't volunteer a citation without corroboration.

### ✅ Allowed bots
GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended — all return HTTP 200 on `/` and `/business/*`.

### Recommended `/llms.txt`
See `ACTION-PLAN.md` — full file ready to drop into `public/llms.txt`.

---

## Local SEO (directory context)

BisDak is a *directory of local businesses*, not a single local business — so traditional GBP/NAP single-entity tactics don't apply. But each `/business/[slug]` page functions as a satellite local-entity page, and the local-SEO scoring is determined by:

- **LocalBusiness schema completeness** — currently ~15%. Adding `telephone`, `address.streetAddress`, `geo`, `openingHoursSpecification` to every listing is the single highest-impact local SEO change you can make.
- **NAP visibility in HTML body** — currently invisible (page renders 104 words). Phone, address, hours must be in static `<dl>` / `<p>` tags, not JS-injected.
- **Reviews** — zero on any sampled listing. The widget exists; the data does not. Without `aggregateRating` schema you lose the star ratings in SERPs.
- **City and category hubs** — sitemap shows only `/business/[slug]`; no detected `/category/*` or `/city/*` hub pages. These are the natural local-SEO landing pages (e.g. `/auckland/restaurants`, `/wellington/remittance`).

---

## SXO (Search Experience)

Two SXO-class issues compound the technical ones:

1. **Users searching Google for "Filipino restaurants Auckland" who land on `/search` get a 403** — a hard failure on the page that should convert them. This wrecks bounce-rate signals on a query the site is purpose-built for.
2. **Business page CTA-to-content ratio is broken.** The page has six visible buttons (Show contact, Website, Share, Write a Review, Submit Review, Back) and ~100 words of content. The dominant call-to-action is "Write a Review" on a listing with zero reviews — a hostile first-visit experience.

---

## Pages by Type

| Type | Count | Notes |
|---|---|---|
| Homepage | 1 | CSR-ish; OK static metadata; no schema |
| Business listings | 1,272 | Thin, wrong schema type, 104 words rendered |
| Blog posts | 9 | Dense and useful; broken canonical; org-only author |
| Tool pages | 6 | Mortgage, PAYE, GST, currency, time-zone, timer — clean copy, broken canonical, no WebApplication schema |
| Browse / utility | 4 | `/search` (403), `/jobs` (403), `/blog` (200), `/tools` (200), `/submit` (200) |

---

*Action plan (prioritised, with concrete fix locations and code snippets) is in `ACTION-PLAN.md`.*
