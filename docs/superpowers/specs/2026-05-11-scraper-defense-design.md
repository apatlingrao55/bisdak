# Design: Scraper Defense (MVP)

**Date:** 2026-05-11
**Status:** Approved

## Overview

Make the BisDak directory meaningfully harder to scrape, targeting two specific threats: (1) phone/email harvesting from business listings, and (2) competitive cloning of the directory at scale. Lean MVP: no Cloudflare, no captchas, no fingerprinting libraries. Three independent layers — contact masking, Postgres-backed rate limiting, and Edge-middleware bot heuristics.

The wins:
- Casual scrapers using `curl` / `requests` get nothing useful and are 403'd off the gated routes.
- Headless-browser scrapers can still get data, but at one-or-more-orders-of-magnitude higher cost — they have to actually click each "Show contact" button, and the contact endpoint is rate-limited per IP.
- Real users see a single extra click on business pages. Public browse and SEO surfaces are unchanged.

---

## Decisions (locked from brainstorming)

| Topic | Choice |
|---|---|
| Threats in scope | (1) Contact harvesting, (2) Competitive cloning |
| Threats deferred | AI training scrapers, resource costs |
| Contact masking style | One-click reveal — server omits the data, button calls a gated endpoint |
| Masked fields | Phone + email only (website / socials stay visible) |
| Stack | Vercel-only, custom middleware (no Cloudflare in v1) |
| Rate-limit storage | Existing Postgres (new `rate_limits` table) |
| Bot heuristics | UA blocklist + `Accept` / `Accept-Language` presence checks |
| Captcha / Turnstile | Not in v1 |
| Sign-in wall on contact | Not in v1 |

---

## Architecture

Three independent layers:

1. **Contact masking** — server stops shipping phone/email in `/business/[slug]` HTML and JSON-LD. New gated endpoint returns them on a click.
2. **Rate limiting** — `rate_limits` table + `rateLimit(ip, route, max, windowSec)` helper, applied to gated routes.
3. **Edge middleware bot heuristics** — runs only on gated routes; lets verified search engines through, rejects blatant tooling and malformed requests, then applies the rate limit.

**Reused infrastructure:** Drizzle, the existing API-route-with-form-POST pattern, `headers()` from `next/headers` for IP. No new dependencies.

**Out of scope for v1 (YAGNI):**
- Cloudflare / WAF
- Turnstile / captcha / hCaptcha
- TLS / JA3 fingerprinting
- IP reputation lookups
- Sign-in wall on contact reveal
- AI-bot-specific blocks (`GPTBot`, `ClaudeBot`, etc.) — separate concern, defer
- Honeypot links
- Watermarks on listings
- Logging dashboard / scraper analytics
- Per-user rate limits (only per-IP in v1)

---

## Layer 1 — Contact masking

### Server side

**`app/business/[slug]/page.tsx`** — remove `biz.phone` and `biz.email` from the rendered HTML. Remove `telephone:` from the JSON-LD `LocalBusiness` object. The fields stay in the DB; the page just doesn't ship them. The "Show contact" button (Section 2) takes their place.

**New API route** — `app/api/businesses/[slug]/contact/route.ts`:

- Method: `POST` (so it's never crawled by GET-only bots, and not in sitemaps).
- Looks up the business by slug.
- Applies `rateLimit({ ip, route: 'contact', max: 10, windowSec: 60 })` and `rateLimit({ ip, route: 'contact', max: 60, windowSec: 3600 })` — both must pass.
- Returns `{ phone, email }` JSON on success. 404 if business not found. 429 if rate-limited. 403 if the bot heuristic upstream rejected it (in practice this never reaches the route handler — middleware short-circuits).
- No CSRF token in v1; the bot heuristic + same-origin check (via `Origin` header) is the gate.

```ts
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'

type Params = Promise<{ slug: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  // Middleware already enforced the 1-min cap via key 'contact:min'.
  // Route handler enforces the 1-hour cap via key 'contact:hour'.
  const ip = ipFromRequest(request)
  const hour = await rateLimit({ ip, route: 'contact:hour', max: 60, windowSec: 3600 })
  if (!hour.ok) return new Response('Rate limited, try again later', { status: 429 })

  const { slug } = await params
  const [biz] = await db
    .select({ phone: businesses.phone, email: businesses.email })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)
  if (!biz) return new Response('Not found', { status: 404 })

  return Response.json({ phone: biz.phone, email: biz.email })
}
```

### Client side

**New component** — `components/RevealContact.tsx` (`'use client'`):

- Renders a single "Show contact" button initially.
- On click: `POST /api/businesses/<slug>/contact`.
- On 200: swaps the button for the same `tel:` and `mailto:` link styles the page used before — visually identical to the old layout, just gated.
- On 429: inline error "Too many requests. Try again in a minute."
- On 403/other: inline error "Unavailable. Try again later." (Don't tell the scraper which check tripped.)

The button is in the SSR HTML — what's gated is the data, not the button's existence. A scraper sees `<button>Show contact</button>` instead of `<a href="tel:+64...">`.

**No artificial delay** on click. Slowing humans by 200ms doesn't slow parallelized scrapers and adds real UX cost.

---

## Layer 2 — Rate limiting

### Schema

```ts
// lib/db/schema.ts
export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ip: text('ip').notNull(),
  route: text('route').notNull(),
  ts: timestamp('ts').defaultNow().notNull(),
})
```

Index: `(ip, route, ts)` — one composite index supports both the count query and the cleanup query.

### Helper

```ts
// lib/rate-limit.ts
import { db } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'

const CLEANUP_PROBABILITY = 1 / 50  // ~2% of calls do a cleanup

export async function rateLimit(opts: {
  ip: string
  route: string
  max: number
  windowSec: number
}): Promise<{ ok: boolean; remaining: number }> {
  const since = sql`now() - (${opts.windowSec} || ' seconds')::interval`

  await db.insert(rateLimits).values({ ip: opts.ip, route: opts.route })

  const [row] = await db
    .select({ n: count() })
    .from(rateLimits)
    .where(and(eq(rateLimits.ip, opts.ip), eq(rateLimits.route, opts.route), gt(rateLimits.ts, since)))

  const used = Number(row?.n ?? 0)
  const ok = used <= opts.max
  const remaining = Math.max(0, opts.max - used)

  if (Math.random() < CLEANUP_PROBABILITY) {
    void db.delete(rateLimits).where(lt(rateLimits.ts, sql`now() - interval '1 day'`))
  }

  return { ok, remaining }
}
```

(Insert-then-count means a request that exceeds the limit still inserts a row; that's fine — it self-corrects on cleanup, and the insert load is trivial.)

### IP source

```ts
// lib/request.ts
import { NextRequest } from 'next/server'

export function ipFromRequest(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (!xff) return 'unknown'
  return xff.split(',')[0].trim() || 'unknown'
}
```

The `'unknown'` bucket has the same per-route limit, so a header-stripping attacker just self-rate-limits along with everyone else lacking the header.

### Limits (initial values)

| Route key | Window | Max per IP | Where enforced |
|---|---|---|---|
| `contact:min` | 1 min | 10 | middleware |
| `contact:hour` | 1 hour | 60 | route handler |
| `search` | 1 min | 60 | middleware |
| `jobs` | 1 min | 60 | middleware |
| `jobs:create` | 1 hour | 10 | middleware + route handler (defence in depth) |
| `submit` | 1 hour | 5 | middleware + route handler (defence in depth) |

These are starting points. Easy to retune without schema changes — they're just numbers passed to `rateLimit()`.

---

## Layer 3 — Edge middleware bot heuristics

### `middleware.ts` (project root)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { ipFromRequest } from '@/lib/request'
import { rateLimit } from '@/lib/rate-limit'

const GOOD_BOT_RE = /(googlebot|bingbot|duckduckbot|slurp|twitterbot|linkedinbot|facebookexternalhit|applebot)/i
const BAD_TOOL_RE = /^(curl|wget|python-requests|python-urllib|scrapy|httpx|go-http-client|java\/|ruby|node-fetch)/i

const ROUTE_LIMITS: Array<{ test: (path: string, method: string) => boolean; key: string; max: number; windowSec: number }> = [
  { test: (p, m) => m === 'POST' && /^\/api\/businesses\/[^/]+\/contact$/.test(p), key: 'contact:min', max: 10, windowSec: 60 },
  { test: (p) => p === '/search', key: 'search', max: 60, windowSec: 60 },
  { test: (p) => p === '/jobs', key: 'jobs', max: 60, windowSec: 60 },
  { test: (p, m) => m === 'POST' && p === '/api/jobs', key: 'jobs:create', max: 10, windowSec: 3600 },
  { test: (p, m) => m === 'POST' && p === '/api/submit', key: 'submit', max: 5, windowSec: 3600 },
]

function block(reason: string, status: number) {
  console.warn(`[scraper-defense] block: ${reason} (status ${status})`)
  return new NextResponse(reason === 'rate-limit' ? 'Rate limited, try again later' : 'Blocked', { status })
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? ''
  const path = request.nextUrl.pathname
  const method = request.method

  // 1. Verified search engines pass.
  if (GOOD_BOT_RE.test(ua)) return NextResponse.next()

  // 2. Reject blatant tooling.
  if (BAD_TOOL_RE.test(ua)) return block('blacklisted-ua', 403)

  // 3. Reject malformed requests (real browsers always send these).
  if (!request.headers.get('accept')) return block('missing-accept', 403)
  if (!request.headers.get('accept-language')) return block('missing-accept-language', 403)

  // 4. Apply rate limit if route matches.
  const limit = ROUTE_LIMITS.find(r => r.test(path, method))
  if (limit) {
    const ip = ipFromRequest(request)
    const result = await rateLimit({ ip, route: limit.key, max: limit.max, windowSec: limit.windowSec })
    if (!result.ok) return block('rate-limit', 429)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/businesses/:slug/contact',
    '/search',
    '/jobs',
    '/api/jobs',
    '/api/submit',
  ],
}
```

**Notes:**

- The matcher is narrow on purpose. Public business detail pages (`/business/[slug]`), job detail pages (`/jobs/[id]`), the homepage, blog, tools, and static assets are NOT in the matcher — middleware never runs for them. SEO and perf are untouched.
- The contact route is rate-limited TWICE: once in middleware (the 1-minute key), once in the route handler (the 1-hour key). Both must pass. Middleware catches bursts cheaply; the route handler enforces the daily cap.
- Good-bot detection is UA-based only, no reverse DNS in v1. UA spoofing for the purpose of *being allowed* is fine — the spoofer still hits rate limits at the per-route handler if any. Spoofing as a goal of *being blocked* is impossible (the only blocked outcome is 403/429, not "indexed by Google").

---

## Edge cases

- **Shared IPs (corporate NAT, mobile carriers).** A whole office can share an IP. 60/hour on contact is generous (a recruiter calling 60 listings in an hour is exceptional). Tune limits if real users complain.
- **Logged-in users hitting limits.** Per-IP in v1, not per-user. Acceptable; future v1.1 could give signed-in users 3× quota.
- **Search engines crawling the contact endpoint.** They won't — `POST` only and not linked anywhere.
- **Stale rows.** Lazy cleanup (~2% of calls run `DELETE WHERE ts < now() - interval '1 day'`).
- **Header-stripping.** Attacker sending empty `x-forwarded-for` collapses into the `'unknown'` bucket, which itself has the limit. Net positive.
- **Headless browsers.** They pass every check in v1. Acceptable — the goal is to make scraping cost order-of-magnitude more expensive (Playwright + per-business click + 10/min cap), not to make it impossible.
- **Accept-Language false positives.** A small number of legit clients lack this header. Acceptable v1 false-positive rate; revisit if user reports come in.
- **Business with no phone/email on file.** The contact endpoint returns `{ phone: null, email: null }`. `RevealContact.tsx` shows "No public contact info" inline. The button can still be clicked (so a scraper can't tell which businesses have data without burning rate-limit quota).
- **Middleware adds DB latency.** Each gated request now does an insert + count on `rate_limits`. At expected volume this is single-digit ms on Vercel. If it ever shows up in p95 latency, the right fix is moving the counter to KV; not in v1.

---

## Errors

| Cause | Status | User-visible message |
|---|---|---|
| UA blocklist match | 403 | `Blocked` (plain text from middleware) |
| Missing `Accept` / `Accept-Language` | 403 | `Blocked` |
| Rate limit hit | 429 | `Rate limited, try again later` |
| Contact 429 in `RevealContact.tsx` | 429 | Inline: "Too many requests. Try again in a minute." |
| Contact 403/other in `RevealContact.tsx` | 403/5xx | Inline: "Unavailable. Try again later." (intentionally generic) |

`console.warn` on every block. Vercel logs capture it. No new dashboard.

---

## Testing

- **Unit-ish** (manual one-shot script in `scripts/`): call `rateLimit()` 11 times in a tight loop with `max=10, windowSec=60` — first 10 return `ok: true`, 11th returns `ok: false`. Wait 60s, call again — `ok: true`.
- **Smoke** (extend `tests/smoke.spec.ts`):
  - Visit `/business/<slug>`, assert no `tel:` / `mailto:` link AND no phone-pattern text in the page HTML.
  - Assert "Show contact" button is visible.
  - Click it, await network response, assert `tel:` link appears.
- **Manual middleware checks:**
  - `curl https://bisdak.co.nz/search` → expect 403 (curl UA blocked).
  - `curl -H "User-Agent: Mozilla/5.0" -H "Accept: text/html" -H "Accept-Language: en" https://bisdak.co.nz/search` → expect 200.
  - 11 such requests in a minute → 11th returns 429.
- **SEO sanity:** Google Search Console URL inspector against `/business/<slug>` after deploy — confirm rendered page has full content (no "Blocked" garbage), and that the page is still indexable. `User-Agent: Googlebot` is in the good-bot allowlist; confirm it gets through.

---

## Implementation order (suggested for the plan)

1. Schema migration (`rate_limits` table + index).
2. `lib/request.ts` (`ipFromRequest`).
3. `lib/rate-limit.ts` (`rateLimit` helper) + a tiny smoke script.
4. `app/api/businesses/[slug]/contact/route.ts` (the data endpoint).
5. `components/RevealContact.tsx` (the client button).
6. Modify `app/business/[slug]/page.tsx` — strip phone/email from HTML and JSON-LD; embed `<RevealContact slug={biz.slug} />` in their place.
7. `middleware.ts` (the bot heuristics + perimeter rate limit).
8. Apply `rateLimit` inside the existing handlers for `/api/jobs` (POST) and `/api/submit` (POST) as defence-in-depth (middleware already covers them, but a second tier hardens against future matcher misconfig).
9. Smoke tests in `tests/smoke.spec.ts` for the contact masking happy path.
10. Manual perimeter checks (curl tests above).
