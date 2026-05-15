# BisDak SEO — Prioritised Action Plan

**Audit date:** 2026-05-15 | **Health Score baseline:** 40 / 100

Priority order: Critical → High → Medium → Low. Estimated impact = expected delta to overall Health Score after the fix ships and is recrawled.

---

## 🔴 Critical (fix within 1 week)

### CR-1 — Stop the canonical collapse
**Impact:** +8–12 points. Unblocks indexing of every blog post, tool page, and category page.
**Fix in:** root layout's `metadata.alternates.canonical`.

The root layout in Next.js is setting an absolute canonical that every nested page inherits unless it overrides it. Only `app/business/[slug]/page.tsx` overrides it; everything else canonicals to `https://bisdak.co.nz`.

Two options — pick one:

**Option A (recommended): set `metadataBase` in root and let pages set their own canonicals.**
```ts
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://bisdak.co.nz'),
  title: { default: 'BisDak — Pinoy Business Hub NZ', template: '%s — BisDak NZ' },
  description: '…',
  // ❌ DELETE: alternates: { canonical: 'https://bisdak.co.nz' }
};
```
Then in each page (or route segment) generate metadata:
```ts
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: post.title,
    alternates: { canonical: `/blog/${slug}` },  // relative — resolved against metadataBase
  };
}
```
Apply the same pattern to `/tools/*`, `/blog`, `/tools`, `/jobs`, `/search`, `/submit`.

**Verification after deploy:**
```bash
for u in / /blog /blog/welcome-to-bisdak /tools /tools/mortgage; do
  echo "=== $u ==="
  curl -s "https://bisdak.co.nz$u" | grep -oE '<link[^>]+rel="canonical"[^>]+>'
done
```
Each should print its own URL.

---

### CR-2 — Stop blocking Googlebot from /search and /jobs
**Impact:** +4–6 points. These two pages have priority 0.9 and 0.8 in the sitemap and are core to user search experience.
**Fix in:** `middleware.ts` matcher config (NextAuth).

`/search` and `/jobs` return HTTP 403 to anonymous users and set NextAuth CSRF cookies. The middleware that protects `/admin` and `/dashboard` is matching too broadly.

Tighten the matcher:
```ts
// middleware.ts
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    // exclude everything else — do NOT use a `(?!api|_next)` catch-all
  ],
};
```
After deploy verify:
```bash
curl -sI https://bisdak.co.nz/search | head -1   # should be HTTP/2 200
curl -sI https://bisdak.co.nz/jobs   | head -1   # should be HTTP/2 200
```

---

### CR-3 — Render business pages server-side so AI crawlers and Google can read them
**Impact:** +6–10 points (touches Schema, Content, AI Readiness simultaneously).
**Fix in:** `app/business/[slug]/page.tsx` rendering strategy.

Every business detail must appear in the initial HTML response, not be JS-injected. Currently only ~104 visible words ship server-side; the rest is React-serialized payload.

Minimum viable rendered body for each listing:
```tsx
<main>
  <nav aria-label="Breadcrumb">…</nav>
  <h1>{biz.name}</h1>
  <p className="lead">{biz.description}</p>
  <dl className="biz-facts">
    <dt>Category</dt><dd>{biz.category}</dd>
    <dt>Address</dt><dd>{biz.streetAddress}, {biz.suburb}, {biz.city}, {biz.region} {biz.postalCode}</dd>
    <dt>Phone</dt><dd><a href={`tel:${biz.phone}`}>{biz.phone}</a></dd>
    <dt>Website</dt><dd><a href={biz.url} rel="noopener">{biz.url}</a></dd>
    <dt>Opening hours</dt><dd>{formatHours(biz.hours)}</dd>
  </dl>
  <section><h2>About this business</h2>{/* 60–120 word unique paragraph */}</section>
  {biz.reviews.length > 0 && <ReviewsSection reviews={biz.reviews} />}
  <RelatedListings categoryId={biz.categoryId} cityId={biz.cityId} limit={6} />
</main>
```

If listing data is fetched in a Server Component (the App Router default), the markup will be in the initial HTML. Verify with `curl ...slug | grep -c '<dt>'`.

---

### CR-4 — Fix the 404 metadata leak
**Impact:** +1–2 points.
**Fix in:** root `app/layout.tsx` + `app/not-found.tsx`.

The duplicate `<meta name="robots">` tags on 404 pages happen because the root layout sets `robots: { index: true, follow: true }` and the not-found handler adds its own `noindex`.

```ts
// app/layout.tsx  — DELETE this from the root metadata:
//   robots: { index: true, follow: true }

// app/not-found.tsx — set explicit metadata
export const metadata: Metadata = {
  title: '404 — Page not found',
  robots: { index: false, follow: false },
  alternates: { canonical: undefined },  // do not leak homepage canonical
};
```

Verify:
```bash
curl -s https://bisdak.co.nz/does-not-exist | grep -c 'name="robots"'   # should be 1
```

---

### CR-5 — Enrich LocalBusiness schema + use correct subtypes
**Impact:** +5–7 points; unlocks rich results across 1,272 pages.
**Fix in:** business page schema generator (likely `lib/schema.ts` or inline in `page.tsx`).

Map category → `@type`:
| Category | `@type` |
|---|---|
| Restaurant / Fast food / Carinderia | `Restaurant` |
| Bakery / Panaderia | `Bakery` |
| Catering | `FoodEstablishment` (with `Caterer` if available in your version) |
| Remittance / Money transfer | `FinancialService` |
| Grocery / Sari-sari store | `GroceryStore` |
| Salon / Spa / Barber | `BeautySalon` / `HairSalon` |
| Doctor / Dentist | `MedicalBusiness` / `Dentist` |
| Auto / Mechanic | `AutoRepair` |
| Default fallback | `LocalBusiness` |

Complete listing schema (concrete fill-from-DB):
```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": "https://bisdak.co.nz/business/jollibee-auckland-central#business",
  "name": "Jollibee Auckland Central",
  "description": "Iconic Filipino fast food chain serving Chickenjoy, Jolly Spaghetti and peach mango pie.",
  "url": "https://jollibee.co.nz",
  "image": "https://bisdak.co.nz/api/og/jollibee-auckland-central",
  "telephone": "+64-9-XXX-XXXX",
  "servesCuisine": "Filipino",
  "priceRange": "$$",
  "hasMap": "https://maps.google.com/?q=Jollibee+Auckland+Central",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "XXX Queen Street",
    "addressLocality": "Auckland CBD",
    "addressRegion": "Auckland",
    "postalCode": "1010",
    "addressCountry": "NZ"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": -36.8485, "longitude": 174.7633 },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "10:00", "closes": "22:00" },
    { "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday","Sunday"], "opens": "09:00", "closes": "23:00" }
  ],
  "sameAs": ["https://www.facebook.com/JollibeeNZ"],
  "areaServed": { "@type": "City", "name": "Auckland" }
}
```
Conditional: emit `aggregateRating` and `review` only when reviews actually exist (do not emit empty `ratingValue: 0`).

---

## 🟠 High (fix within 2 weeks)

### H-1 — Add Organization + WebSite/SearchAction schema to root
**Impact:** +2–3 points. Unlocks Knowledge Graph entity + Sitelinks Searchbox.
**Fix in:** `app/layout.tsx` — inject as a Server Component `<script type="application/ld+json">`.

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://bisdak.co.nz/#organization",
    "name": "BisDak",
    "url": "https://bisdak.co.nz",
    "logo": { "@type": "ImageObject", "url": "https://bisdak.co.nz/icons/icon-512x512.png" },
    "description": "New Zealand's directory of Filipino-owned businesses.",
    "areaServed": "NZ",
    "sameAs": [
      "https://www.facebook.com/bisdaknz",
      "https://www.instagram.com/bisdaknz"
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://bisdak.co.nz/#website",
    "url": "https://bisdak.co.nz",
    "name": "BisDak — Pinoy Business Hub NZ",
    "publisher": { "@id": "https://bisdak.co.nz/#organization" },
    "potentialAction": {
      "@type": "SearchAction",
      "target": { "@type": "EntryPoint", "urlTemplate": "https://bisdak.co.nz/search?q={search_term_string}" },
      "query-input": "required name=search_term_string"
    }
  }
]
```
NB: SearchAction requires CR-2 (the /search route must return 200).

---

### H-2 — Publish `/llms.txt`
**Impact:** +2 points to AI Readiness.
**Fix in:** new file `public/llms.txt` (served at `/llms.txt`).

```
# BisDak — Filipino Business Directory New Zealand
# https://bisdak.co.nz

> BisDak is New Zealand's directory of Filipino-owned businesses, serving the
> Kiwi-Filipino community across Auckland, Wellington, Christchurch, Hamilton and beyond.
> The name "BisDak" is Cebuano slang for "Bisaya" — the Visayan-speaking peoples
> of the central and southern Philippines — and reflects the site's community roots.

## About
BisDak is a Kiwi-Filipino directory platform listing Filipino-owned businesses across
New Zealand. It covers categories including food and dining, remittance services,
catering, retail, beauty, healthcare and trades. The platform also publishes guides
relevant to Filipinos living in or migrating to New Zealand.

## Business directory
- All listings: https://bisdak.co.nz/search
- Submit a listing: https://bisdak.co.nz/submit

## Community blog
- Blog index: https://bisdak.co.nz/blog
- INZ application system guide: https://bisdak.co.nz/blog/inz-application-system-upgrade-what-filipino-applicants-must-know
- Accredited Employer Work Visa guide: https://bisdak.co.nz/blog/accredited-employer-work-visa-nz-requirements-explained
- Caregiver jobs in NZ: https://bisdak.co.nz/blog/caregiver-jobs-in-new-zealand-for-filipinos-full-guide
- Balikbayan box from NZ guide: https://bisdak.co.nz/blog/how-to-send-a-balikbayan-box-from-nz-complete-guide

## Free tools
- NZ Mortgage Calculator: https://bisdak.co.nz/tools/mortgage
- NZ PAYE Calculator:     https://bisdak.co.nz/tools/paye
- NZ GST Calculator:      https://bisdak.co.nz/tools/gst
- NZD/PHP Currency:       https://bisdak.co.nz/tools/currency
- NZ↔PH Time Zone:        https://bisdak.co.nz/tools/time-zone

## Contact
- Email: hello@bisdak.co.nz
```

---

### H-3 — Fix the double-brand in titles
**Impact:** +1 point.
**Fix in:** root layout `title.template` and any page-level `title` strings.

Currently:
```ts
title: { default: 'BisDak — Pinoy Business Hub NZ', template: '%s — BisDak NZ' }
```
And `app/blog/page.tsx` exports `title: 'News & Stories — BisDak Pinoy Business Hub NZ'` → final renders as `News & Stories — BisDak Pinoy Business Hub NZ — BisDak NZ`.

Either:
- Strip "BisDak" from individual page titles (so `title: 'News & Stories'` becomes `News & Stories — BisDak NZ`), or
- Use `title: { absolute: 'News & Stories — BisDak NZ' }` on the blog index page to skip the template suffix.

Same fix for blog post pages: `title: { absolute: post.title }` if `post.title` already contains BisDak.

---

### H-4 — Add BreadcrumbList + WebApplication schema
**Impact:** +1–2 points.

**BreadcrumbList** on business and blog pages:
```json
{ "@context": "https://schema.org", "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://bisdak.co.nz" },
    { "@type": "ListItem", "position": 2, "name": "Food & Dining", "item": "https://bisdak.co.nz/category/food-dining" },
    { "@type": "ListItem", "position": 3, "name": "Jollibee Auckland Central", "item": "https://bisdak.co.nz/business/jollibee-auckland-central" }
  ]}
```

**WebApplication** on each `/tools/*` calculator:
```json
{ "@context": "https://schema.org", "@type": "WebApplication",
  "name": "NZ Mortgage Repayment Calculator",
  "url": "https://bisdak.co.nz/tools/mortgage",
  "description": "Calculate your New Zealand home loan repayments by loan amount, interest rate, and term.",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "All",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "NZD" },
  "publisher": { "@id": "https://bisdak.co.nz/#organization" } }
```

---

### H-5 — Build /about, /contact, /authors
**Impact:** +2–3 points to E-E-A-T.

- **`/about`** — who runs BisDak, where based (NZ), why the directory exists, how listings are sourced/verified.
- **`/contact`** — email (hello@bisdak.co.nz is in the autoblog config already), contact form, optional postal address.
- **`/authors/[slug]`** — one page per real human contributor with a 100–200 word bio, links to their other posts, and (optional) credentials.

Then update `BlogPosting.author`:
```json
"author": {
  "@type": "Person",
  "name": "Anya Patling",
  "url": "https://bisdak.co.nz/authors/anya-patling"
}
```

---

### H-6 — Fix BlogPosting schema gaps
**Impact:** +1 point.

Add to every `BlogPosting`:
- `image` — `{ "@type": "ImageObject", "url": og-image-url, "width": 1200, "height": 630 }`
- `dateModified` — from CMS, fall back to `datePublished` if not edited
- `mainEntityOfPage` — `{ "@type": "WebPage", "@id": canonical-url }`

---

### H-7 — Eliminate the hero video as LCP
**Impact:** +3–5 points to performance.

Two options:
- **Easiest**: Add `poster="/hero-fallback.webp"` and `preload="none"`, then load the video below the fold or behind user interaction (intersection observer).
- **Better**: Replace the autoplay video with a static WebP/AVIF hero (< 80 KB) and offer the video on click. Same emotional payoff, fraction of the bytes.

After deploy, re-run `curl -w "%{time_total}\n" -o /dev/null https://bisdak.co.nz/` against a cold edge.

---

## 🟡 Medium (fix within 1 month)

### M-1 — Add 5 security headers
**Fix in:** `next.config.ts` `headers()`.
```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      // CSP requires a pass through your script/style/font/image origins first — do not deploy a strict CSP without testing
    ],
  }];
}
```

### M-2 — Drop business sitemap `priority` to 0.5 and emit real `lastmod`
**Fix in:** `app/sitemap.ts` (or wherever sitemap is generated).

```ts
businesses.map(b => ({
  url: `https://bisdak.co.nz/business/${b.slug}`,
  lastModified: b.updatedAt,           // not Date.now()
  changeFrequency: 'monthly' as const, // monthly is honest for static listings
  priority: 0.5,                       // not 0.8
}));
```

### M-3 — Build category and city hub pages
**Fix in:** new routes `app/category/[slug]/page.tsx` and `app/city/[slug]/page.tsx`.

Each hub should be a server-rendered ItemList of businesses in that category/city, with 200+ words of unique intro copy explaining the community context, and link out to each listing. These are the natural local-search landing pages and they currently do not exist.

Add `ItemList` schema on each.

### M-4 — Add a listing-verification badge / process
**Fix in:** business page UI + new `/verification` doc page.

Visible status per listing: "Owner-claimed", "Phone-verified", "Community-submitted". Add a process page explaining how listings are sourced and what each badge means. This directly addresses Google's "site reputation abuse" / scaled-content concern: it differentiates BisDak from generic scrapers by saying *we curate*.

### M-5 — Tighten /admin: return 401 or 404, not 200
**Fix in:** `app/admin/layout.tsx` or `middleware.ts`.

A 200 on `/admin` is a public-facing trust gap (even if behind an empty page). Make it require auth and return 401 unauthorised.

### M-6 — Connect Google Search Console + GA4
**Impact:** unblocks real CWV/INP/CLS field data and indexation tracking.
**Fix in:** GSC verify domain property, GA4 link, optional `python scripts/google_auth.py` setup for ongoing audits.

---

## 🟢 Low (backlog)

- L-1 — Promote H3 → H2 on blog posts; add `id` anchors to each heading for AI section-linking.
- L-2 — Add a "Quick answer" box (40–80 words) at the top of every blog post for AI citation extraction.
- L-3 — Remove `<meta name="keywords">` — unused by Google for over a decade.
- L-4 — Build category/city sitemap index files (split `sitemap.xml` into `sitemap-businesses.xml`, `sitemap-blog.xml`, etc. once /business count exceeds 5k).
- L-5 — Add JSON-LD `aggregateRating` to listings once 1+ reviews exist (gate on actual data, never fake it).
- L-6 — Apply for Wikipedia entity ("BisDak (directory)") once you have a press mention to cite. Also create Trustpilot and Reddit r/newzealand presence.
- L-7 — Audit images for `loading="lazy"`, `width`/`height` attributes (CLS prevention), and WebP/AVIF format.
- L-8 — Add hreflang only if you launch a Tagalog/Cebuano edition — currently single-language so skip.

---

## Rollout sequence (suggested)

| Sprint | Goal | Items | Est. score after |
|---|---|---|---|
| 1 (Week 1) | Stop the bleeding | CR-1, CR-2, CR-4, H-2 | 52 |
| 2 (Week 2) | Make the directory visible | CR-3, CR-5, H-1 | 64 |
| 3 (Week 3) | Trust + structure | H-3, H-4, H-5, H-6 | 70 |
| 4 (Month 2) | Performance + hubs | H-7, M-1, M-2, M-3 | 76 |
| 5 (Month 3) | Hardening + measurement | M-4, M-5, M-6 | 80 |

---

## Verification checklist (run after Sprint 1 and Sprint 2)

```bash
# Canonical sanity
for u in / /blog /blog/welcome-to-bisdak /tools /tools/mortgage /business/jollibee-auckland-central; do
  echo "=== $u ==="
  curl -s "https://bisdak.co.nz$u" | grep -oE '<link[^>]+rel="canonical"[^>]+>'
done
# Each should print its own URL.

# Public routes
curl -sI https://bisdak.co.nz/search | head -1   # HTTP/2 200
curl -sI https://bisdak.co.nz/jobs   | head -1   # HTTP/2 200

# 404 metadata
curl -s https://bisdak.co.nz/does-not-exist-xyz | grep -c 'name="robots"'   # 1

# Business page body has real content
curl -s https://bisdak.co.nz/business/jollibee-auckland-central | python3 -c "
import sys, re
h=sys.stdin.read(); h=re.sub(r'<script[^>]*>.*?</script>','',h,flags=re.S)
h=re.sub(r'<style[^>]*>.*?</style>','',h,flags=re.S)
print(len(re.sub(r'<[^>]+>',' ',h).split()), 'words')
"   # target: 300+ words

# llms.txt
curl -sI https://bisdak.co.nz/llms.txt | head -1   # HTTP/2 200

# Schema
curl -s https://bisdak.co.nz/ | grep -oE '"@type":"[^"]+"'   # should include Organization, WebSite
```
