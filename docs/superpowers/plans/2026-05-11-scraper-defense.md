# Scraper Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BisDak meaningfully harder to scrape — block phone/email harvesting at its source and rate-limit the routes that matter for competitive cloning.

**Architecture:** Three independent layers added to the existing Next.js + Drizzle + Postgres stack. (1) Server stops shipping phone/email in `/business/[slug]` HTML and JSON-LD; replaced by a client `<RevealContact>` button that calls a new gated `POST /api/businesses/[slug]/contact` endpoint. (2) New `rate_limits` table + sliding-window helper, applied per-IP per-route. (3) Edge middleware (`middleware.ts`) lets verified search engines through, rejects blatant tooling (`curl`, `wget`, `python-requests`, etc.) and malformed requests, then applies the rate limit on the narrow gated-route matcher.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (postgres), Edge middleware, Playwright smoke tests.

**Codebase conventions to follow:**
- Forms POST to `app/api/...` routes (the project does not use Next server actions for forms).
- IDs use `text(...).primaryKey().$defaultFn(() => crypto.randomUUID())`.
- Inline styles, dark theme: `#000000` bg, `#A1A1AA` body, `#36F4A4` accent. Existing CSS classes: `input-dark`, `btn-primary`, `btn-ghost`.
- No unit-test framework — Playwright smoke tests via `npm run test:smoke` is the only test layer.
- Migrations: `drizzle-kit generate` produces SQL in `drizzle/`. The project applies them via direct execution (no `__drizzle_migrations` tracking table) — see `scripts/apply-0001.ts` for an example pattern.

**Spec:** `docs/superpowers/specs/2026-05-11-scraper-defense-design.md`

---

## File map

**New:**
- `lib/request.ts` — `ipFromRequest(request)`
- `lib/rate-limit.ts` — `rateLimit({ ip, route, max, windowSec })`
- `app/api/businesses/[slug]/contact/route.ts` — POST contact endpoint
- `components/RevealContact.tsx` — client "Show contact" button
- `middleware.ts` — Edge middleware (project root)

**Modified:**
- `lib/db/schema.ts` — add `rateLimits` table
- `app/business/[slug]/page.tsx` — drop `telephone` from JSON-LD; replace `tel:` and `mailto:` buttons with `<RevealContact>`
- `app/api/jobs/route.ts` — defence-in-depth `rateLimit` call
- `app/api/submit/route.ts` — defence-in-depth `rateLimit` call
- `tests/smoke.spec.ts` — append masking smoke tests

**Generated:**
- `drizzle/0002_*.sql` — migration produced by `drizzle-kit generate`

---

## Task 1: Schema + migration

**Files:**
- Modify: `lib/db/schema.ts`
- Generate: `drizzle/0002_*.sql`

- [ ] **Step 1: Add `rateLimits` table to schema**

Append to `lib/db/schema.ts` (at the very end, after the `verificationTokens` table):

```ts
export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ip: text('ip').notNull(),
  route: text('route').notNull(),
  ts: timestamp('ts').defaultNow().notNull(),
})
```

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: A new file `drizzle/0002_<word>_<word>.sql` is created containing `CREATE TABLE "rate_limits"`.

- [ ] **Step 3: Inspect the migration**

Open the new `drizzle/0002_*.sql`. Verify it contains ONLY the `rate_limits` CREATE TABLE — nothing else. If drizzle-kit detects any unrelated drift, report it as DONE_WITH_CONCERNS rather than silently committing.

- [ ] **Step 4: Append the index to the migration**

Append at the end of the new `drizzle/0002_*.sql`:

```sql
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_ip_route_ts_idx" ON "rate_limits" ("ip", "route", "ts");
```

- [ ] **Step 5: Apply the migration to the live DB**

Use the same pattern as `scripts/apply-0001.ts`. Create a one-off script `scripts/apply-0002.ts`:

```ts
import { readFileSync, readdirSync } from 'fs'
import postgres from 'postgres'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const file = readdirSync('drizzle').find(f => f.startsWith('0002_'))!
  const stmts = readFileSync(`drizzle/${file}`, 'utf8')
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)

  console.log(`Applying ${stmts.length} statements from drizzle/${file}`)
  await sql.begin(async tx => {
    for (let i = 0; i < stmts.length; i++) {
      console.log(`[${i + 1}/${stmts.length}] ${stmts[i].split('\n')[0].slice(0, 80)}…`)
      await tx.unsafe(stmts[i])
    }
  })
  console.log('Done.')
  await sql.end()
}

main().catch(async e => { console.error('FAILED:', e); await sql.end(); process.exit(1) })
```

Run: `npx tsx scripts/apply-0002.ts`
Expected: All statements apply, `Done.` printed.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(scraper-defense): rate_limits table + migration"
```

(`scripts/apply-0002.ts` is intentionally untracked — same pattern as `scripts/apply-0001.ts` and the other ad-hoc scripts.)

---

## Task 2: `ipFromRequest` helper

**Files:**
- Create: `lib/request.ts`

- [ ] **Step 1: Implement the helper**

Create `lib/request.ts`:

```ts
import { NextRequest } from 'next/server'

export function ipFromRequest(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (!xff) return 'unknown'
  return xff.split(',')[0].trim() || 'unknown'
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add lib/request.ts
git commit -m "feat(scraper-defense): ipFromRequest helper"
```

---

## Task 3: `rateLimit` helper

**Files:**
- Create: `lib/rate-limit.ts`

- [ ] **Step 1: Implement the helper**

Create `lib/rate-limit.ts`:

```ts
import { db } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'

const CLEANUP_PROBABILITY = 1 / 50

export async function rateLimit(opts: {
  ip: string
  route: string
  max: number
  windowSec: number
}): Promise<{ ok: boolean; remaining: number }> {
  const since = sql`now() - (${String(opts.windowSec)} || ' seconds')::interval`

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

- [ ] **Step 2: Manual smoke (one-off script)**

Create `scripts/check-rate-limit.ts`:

```ts
import { readFileSync } from 'fs'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

import { rateLimit } from '../lib/rate-limit'

async function main() {
  const ip = `test-${Date.now()}`
  for (let i = 1; i <= 12; i++) {
    const r = await rateLimit({ ip, route: 'test', max: 10, windowSec: 60 })
    console.log(`call ${i}: ok=${r.ok} remaining=${r.remaining}`)
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
```

Run: `npx tsx scripts/check-rate-limit.ts`
Expected: calls 1–10 return `ok=true`, calls 11–12 return `ok=false`.

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add lib/rate-limit.ts
git commit -m "feat(scraper-defense): sliding-window rateLimit helper"
```

(`scripts/check-rate-limit.ts` stays untracked.)

---

## Task 4: Contact API route

**Files:**
- Create: `app/api/businesses/[slug]/contact/route.ts`

- [ ] **Step 1: Implement the endpoint**

Create `app/api/businesses/[slug]/contact/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'

type Params = Promise<{ slug: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  // Middleware enforces the 1-min cap (key 'contact:min').
  // Route handler enforces the 1-hour cap (key 'contact:hour').
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

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add 'app/api/businesses/[slug]/contact/route.ts'
git commit -m "feat(scraper-defense): POST /api/businesses/[slug]/contact"
```

---

## Task 5: `RevealContact` component

**Files:**
- Create: `components/RevealContact.tsx`

- [ ] **Step 1: Implement the component**

Create `components/RevealContact.tsx`:

```tsx
'use client'
import { useState } from 'react'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'shown'; phone: string | null; email: string | null }
  | { kind: 'error'; message: string }

type Props = { slug: string }

export default function RevealContact({ slug }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function reveal() {
    setState({ kind: 'loading' })
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(slug)}/contact`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      })
      if (res.status === 429) {
        setState({ kind: 'error', message: 'Too many requests. Try again in a minute.' })
        return
      }
      if (!res.ok) {
        setState({ kind: 'error', message: 'Unavailable. Try again later.' })
        return
      }
      const data = (await res.json()) as { phone: string | null; email: string | null }
      setState({ kind: 'shown', phone: data.phone, email: data.email })
    } catch {
      setState({ kind: 'error', message: 'Unavailable. Try again later.' })
    }
  }

  if (state.kind === 'shown') {
    if (!state.phone && !state.email) {
      return (
        <span style={{ color: '#A1A1AA', fontSize: 14, padding: '14px 0' }}>
          No public contact info on file.
        </span>
      )
    }
    return (
      <>
        {state.phone && (
          <a href={`tel:${state.phone}`} className="btn-primary" style={{ fontSize: 16, padding: '14px 28px' }}>
            📞 {state.phone}
          </a>
        )}
        {state.email && (
          <a href={`mailto:${state.email}`} className="btn-ghost" style={{ fontSize: 16, padding: '14px 28px' }}>
            ✉️ Email
          </a>
        )}
      </>
    )
  }

  if (state.kind === 'error') {
    return (
      <span style={{ color: '#F472B6', fontSize: 14, padding: '14px 0' }}>{state.message}</span>
    )
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={state.kind === 'loading'}
      className="btn-primary"
      style={{ fontSize: 16, padding: '14px 28px' }}
    >
      {state.kind === 'loading' ? 'Loading…' : '📞 Show contact'}
    </button>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add components/RevealContact.tsx
git commit -m "feat(scraper-defense): RevealContact client component"
```

---

## Task 6: Strip phone/email from business detail page

**Files:**
- Modify: `app/business/[slug]/page.tsx`

- [ ] **Step 1: Read the current page**

Open `app/business/[slug]/page.tsx`. Locate:
- The JSON-LD `jsonLd` object (around line 85-91) which includes `telephone: biz.phone ?? undefined`.
- The Contact Strip section (around line 209-236) with the `biz.phone &&` and `biz.email &&` blocks.

- [ ] **Step 2: Drop `telephone` from JSON-LD**

In the `jsonLd` object, remove the `telephone: biz.phone ?? undefined,` line entirely. The schema.org `LocalBusiness` type does not require it.

- [ ] **Step 3: Replace the phone + email buttons with `<RevealContact>`**

Add the import at the top of the file:

```tsx
import RevealContact from '@/components/RevealContact'
```

In the Contact Strip section, replace:

```tsx
{biz.phone && (
  <a href={`tel:${biz.phone}`} className="btn-primary" style={{ fontSize: '16px', padding: '14px 28px' }}>
    📞 {biz.phone}
  </a>
)}
```

…AND…

```tsx
{biz.email && (
  <a href={`mailto:${biz.email}`} className="btn-ghost" style={{ fontSize: '16px', padding: '14px 28px' }}>
    ✉️ Email
  </a>
)}
```

…with a single line in the same position:

```tsx
{(biz.phone || biz.email) && <RevealContact slug={biz.slug} />}
```

The website / Facebook / Get Directions / ShareButton / ClaimButton blocks stay exactly as they are.

- [ ] **Step 4: Verify HTML no longer leaks contact**

Run: `npm run dev` in one terminal, then in another:

```bash
curl -s -H "User-Agent: Mozilla/5.0" -H "Accept: text/html" -H "Accept-Language: en" http://localhost:3000/business/<some-real-slug> | grep -E "tel:|mailto:|telephone"
```

Expected: no output (no matches). If any line prints, the page still leaks contact info — fix and re-test.

(Replace `<some-real-slug>` with any real slug — e.g. find one with `psql $DATABASE_URL -c "SELECT slug FROM businesses LIMIT 1"`, or just hit `/search` in the browser and copy a URL.)

- [ ] **Step 5: Type check + commit**

```bash
npx tsc --noEmit
git add 'app/business/[slug]/page.tsx'
git commit -m "feat(scraper-defense): mask phone/email behind RevealContact"
```

---

## Task 7: Edge middleware

**Files:**
- Create: `middleware.ts` (project root, NOT inside `app/`)

- [ ] **Step 1: Implement the middleware**

Create `middleware.ts` at the project root:

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

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Smoke check the middleware locally**

Run: `npm run dev` in one terminal. Then:

```bash
# 1. Curl with default UA → expect 403
curl -i http://localhost:3000/jobs 2>&1 | head -1
# Expected: HTTP/1.1 403

# 2. Curl with browser-like headers → expect 200
curl -i \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  -H "Accept: text/html" \
  -H "Accept-Language: en-NZ,en;q=0.9" \
  http://localhost:3000/jobs 2>&1 | head -1
# Expected: HTTP/1.1 200

# 3. Curl with Googlebot UA → expect 200 (allowlist passes through)
curl -i -H "User-Agent: Googlebot/2.1" http://localhost:3000/jobs 2>&1 | head -1
# Expected: HTTP/1.1 200

# 4. 11 browser-like requests in a row → 11th expect 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "User-Agent: Mozilla/5.0" -H "Accept: text/html" -H "Accept-Language: en" \
    http://localhost:3000/api/businesses/<slug>/contact -X POST
done
# Expected: 200/200/200/.../200 (10 of them), then 429
```

(The contact endpoint will return 200 for the first 10 if the slug exists, even though it's the 1-min middleware check that's being exercised — the count comes from `rate_limits` rows.)

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(scraper-defense): Edge middleware (UA blocklist + rate limit)"
```

---

## Task 8: Defence-in-depth — `rateLimit` inside `/api/jobs` POST

**Files:**
- Modify: `app/api/jobs/route.ts`

- [ ] **Step 1: Add a second-tier rate limit inside the handler**

Open `app/api/jobs/route.ts`. After the auth check (after `if (!session?.user?.id) ...`) and BEFORE the `formData = await request.formData()` line, insert:

```ts
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'
```

(Add to existing imports at the top — do not duplicate.)

Then inside `POST`, after the auth check:

```ts
const ip = ipFromRequest(request)
const rl = await rateLimit({ ip, route: 'jobs:create', max: 10, windowSec: 3600 })
if (!rl.ok) return new Response('Rate limited, try again later', { status: 429 })
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/api/jobs/route.ts
git commit -m "feat(scraper-defense): rate limit /api/jobs POST (defence in depth)"
```

---

## Task 9: Defence-in-depth — `rateLimit` inside `/api/submit` POST

**Files:**
- Modify: `app/api/submit/route.ts`

- [ ] **Step 1: Add a second-tier rate limit inside the handler**

Open `app/api/submit/route.ts`. Add to existing imports at the top:

```ts
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'
```

Inside `POST`, before any other work:

```ts
const ip = ipFromRequest(request)
const rl = await rateLimit({ ip, route: 'submit', max: 5, windowSec: 3600 })
if (!rl.ok) return new Response('Rate limited, try again later', { status: 429 })
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/api/submit/route.ts
git commit -m "feat(scraper-defense): rate limit /api/submit (defence in depth)"
```

---

## Task 10: Smoke tests for masking

**Files:**
- Modify: `tests/smoke.spec.ts`

- [ ] **Step 1: Append masking smoke tests**

Open `tests/smoke.spec.ts`. The file already has a `businessSlug` fixture (set in `beforeAll`) and uses `collectConsoleErrors`. Append at the end:

```ts
test('business detail page does not leak phone/email in HTML', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses — skipping')
    return
  }
  const errors = collectConsoleErrors(page)
  await page.goto(businessSlug)
  // Show contact button visible
  await expect(page.getByRole('button', { name: /show contact/i }).first()).toBeVisible()
  // No tel: or mailto: anchors in the rendered HTML
  expect(await page.locator('a[href^="tel:"]').count()).toBe(0)
  expect(await page.locator('a[href^="mailto:"]').count()).toBe(0)
  // No telephone field in JSON-LD
  const ldText = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(ldText ?? '').not.toContain('telephone')
  expect(errors).toHaveLength(0)
})

test('clicking show-contact reveals phone or email', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses — skipping')
    return
  }
  await page.goto(businessSlug)
  const btn = page.getByRole('button', { name: /show contact/i }).first()
  await btn.click()
  // Wait for either tel:/mailto: link OR the "no public contact" message
  const anyResult = page.locator('a[href^="tel:"], a[href^="mailto:"], text=/no public contact info/i')
  await expect(anyResult.first()).toBeVisible({ timeout: 5000 })
})
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add tests/smoke.spec.ts
git commit -m "test(scraper-defense): masking smoke tests"
```

---

## Task 11: End-to-end manual verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Visit a business page in the browser**

Open `http://localhost:3000/business/<some-slug>` in a regular browser tab (use a real slug from your DB).

Confirm:
- "📞 Show contact" button is visible.
- "📞 +64..." (or whatever) is NOT visible until you click.
- "✉️ Email" link is NOT visible until you click.
- Click the button → phone and/or email links appear in their place.

- [ ] **Step 3: View source / DevTools**

DevTools → Network tab → reload the page. Look at the response HTML for `/business/<slug>`. Confirm:
- No `tel:` strings.
- No `mailto:` strings.
- The JSON-LD `<script type="application/ld+json">` has no `"telephone"` field.

- [ ] **Step 4: Curl probes**

```bash
# Default curl UA → 403
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/jobs
# Expected: 403

# Browser-like headers → 200
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "User-Agent: Mozilla/5.0" -H "Accept: text/html" -H "Accept-Language: en" \
  http://localhost:3000/jobs
# Expected: 200

# Googlebot UA → 200 (passes allowlist)
curl -s -o /dev/null -w "%{http_code}\n" -H "User-Agent: Googlebot/2.1" http://localhost:3000/jobs
# Expected: 200
```

- [ ] **Step 5: Per-IP rate limit probe**

```bash
SLUG=<a real business slug>
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "User-Agent: Mozilla/5.0" -H "Accept: */*" -H "Accept-Language: en" \
    -X POST "http://localhost:3000/api/businesses/$SLUG/contact"
done
echo
# Expected: ten 200s, then 429s.
```

- [ ] **Step 6: Confirm SEO surfaces still work**

```bash
curl -s -H "User-Agent: Googlebot/2.1" -H "Accept: text/html" -H "Accept-Language: en" \
  http://localhost:3000/jobs | wc -c
# Expected: a real-sized HTML response (thousands of bytes), not "Blocked".

curl -s -H "User-Agent: Googlebot/2.1" -H "Accept: text/html" -H "Accept-Language: en" \
  "http://localhost:3000/business/<some-slug>" | wc -c
# Expected: same — full page.
```

- [ ] **Step 7: Cleanup `rate_limits` test rows**

```bash
psql $DATABASE_URL -c "DELETE FROM rate_limits WHERE route IN ('test','search','jobs','contact:min','contact:hour','jobs:create','submit') AND ts < now() - interval '1 hour'"
```

(Optional — the lazy cleanup will eventually do this anyway.)

---

## Done criteria

- All 11 tasks completed and committed.
- `npx tsc --noEmit` clean.
- `npm run test:smoke` passes (existing + new masking tests).
- Manual checks pass: HTML contains no contact, click reveals it, `curl` is 403'd, Googlebot is 200, 11th burst gets 429.
- `rate_limits` table populated and the index exists in the live DB.

## Post-deploy verification

After `vercel --prod`:

```bash
# 1. Public page no longer leaks contact
curl -s -A "Mozilla/5.0" -H "Accept: text/html" -H "Accept-Language: en" \
  https://bisdak.co.nz/business/<slug> | grep -cE "tel:|mailto:|telephone"
# Expected: 0

# 2. Curl 403'd from /jobs
curl -s -o /dev/null -w "%{http_code}\n" https://bisdak.co.nz/jobs
# Expected: 403

# 3. Googlebot still served
curl -s -o /dev/null -w "%{http_code}\n" -A "Googlebot/2.1" https://bisdak.co.nz/jobs
# Expected: 200
```
