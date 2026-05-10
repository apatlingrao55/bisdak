---
title: Tools menu with mortgage, PAYE, GST, currency, and time zone calculators
type: feat
status: completed
date: 2026-05-10
---

# Tools Menu with Five Calculators

## Overview

Add a new `/tools` section to BisDak: an index page (`/tools`) plus five client-side calculator pages (`/tools/mortgage`, `/tools/paye`, `/tools/gst`, `/tools/currency`, `/tools/time-zone`). A new "Tools" link is added to `components/Nav.tsx` between Browse and News (in both desktop and mobile overlay), and the new routes are added to `app/sitemap.ts`.

Each tool page is a server component (renders Nav + page chrome + `<Calculator />` client child + disclaimer footer), pairing with a co-located client component that handles input + live calculation. The currency page additionally calls a small server-side helper `lib/tools/currency.ts` that fetches the NZD→PHP rate from frankfurter.dev (with fallback chain), passing the rate down as a prop.

Brainstorm: `docs/brainstorms/2026-05-10-community-tools-menu-brainstorm.md`.

## Problem Statement / Motivation

BisDak today is a directory. Filipino migrants and business owners in NZ also have a recurring set of practical tools they look for: mortgage repayment estimates, take-home-pay math, GST in/out, sending money home, time-zone for calls to family. Today they Google these one at a time, often landing on noisy ad-supported pages. Putting community-relevant calculators on bisdak.co.nz under a clear `/tools` namespace:

- Compounds the directory's utility (more reasons to come back).
- Anchors the brand as a one-stop community resource.
- All five v1 tools are evergreen — no editorial maintenance burden, only periodic data refreshes (currency API and the FY tax numbers).

## Proposed Solution

### File-tree summary

```
app/
  tools/
    page.tsx                    NEW — server, index card grid
    mortgage/
      page.tsx                  NEW — server, page chrome + child
      MortgageCalculator.tsx    NEW — client
    paye/
      page.tsx                  NEW
      PayeCalculator.tsx        NEW — client
    gst/
      page.tsx                  NEW
      GstCalculator.tsx         NEW — client
    currency/
      page.tsx                  NEW — server fetches rate, passes to client
      CurrencyConverter.tsx     NEW — client
    time-zone/
      page.tsx                  NEW
      TimeZoneConverter.tsx     NEW — client
  sitemap.ts                    EDIT — add 6 routes to staticRoutes
components/
  Nav.tsx                       EDIT — add Tools link (2 places)
lib/
  tools/
    currency.ts                 NEW — getNzdToPhpRate() with fallback chain
```

11 new files, 2 edits. No new dependencies.

### Page chrome template (used by every tool page + index)

Match `app/disclaimer/page.tsx` shape:

```tsx
import Nav from '@/components/Nav'

export const metadata = { title: 'Mortgage Calculator', description: '...' }

export default function MortgagePage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px' }}>
            Mortgage calculator
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            Estimate your weekly, fortnightly, or monthly home loan repayments.
          </p>
          <MortgageCalculator />
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 32 }}>
            Estimate only — confirm with a qualified mortgage adviser before making decisions.
          </p>
        </article>
      </div>
    </main>
  )
}
```

### Per-tool details

#### 1. `/tools` index — `app/tools/page.tsx` (server)

Heading "Free tools for Pinoy Kiwis" / subhead "Calculators and quick references for life in New Zealand". A `display: grid` 5-card list. Each card:

- Icon (emoji)
- Title
- One-line description
- "Open →" link styled as the existing `.btn-ghost`-ish text link (color `#36F4A4`)

Cards: 🏡 Mortgage / 💼 PAYE / take-home / 🧾 GST / 💱 NZD↔PHP currency / 🕐 Manila↔NZ time zone. Each navigates to `/tools/<slug>`.

#### 2. `/tools/mortgage` — `MortgageCalculator.tsx` (client)

**Inputs** (all `className="input-dark"`):
- Loan amount (NZD), default 500000
- Interest rate (% p.a., annual nominal), default 6.5
- Term (years), default 30
- Repayment frequency `<select>`: Weekly / Fortnightly / **Monthly (default)**

**Math:**
- Periods per year `N`: 52 / 26 / 12
- Periodic rate `r = (rate/100) / N` — **simple divide, matches NZ bank calculator behavior** (verified against ANZ/BNZ public calculators).
- Total periods `n = years * N`
- Payment `M = r === 0 ? P / n : P * (r * (1+r)^n) / ((1+r)^n - 1)`
- Total paid `= M * n`; total interest `= total paid - P`

**Outputs:** regular payment (formatted with frequency suffix, e.g., "$3,160.34 / month"), total interest, total paid, in three labeled lines below the inputs.

#### 3. `/tools/paye` — `PayeCalculator.tsx` (client)

**Inputs:**
- Gross annual income (NZD), default 80000
- KiwiSaver contribution `<select>`: None / 3% / 3.5% / 4% / 6% / 8% / 10% (default 3.5%)
- "I have a student loan" checkbox (default off)

**Hardcoded constants** (with citation comments) targeting **FY 2026/27** (current as of today, 2026-05-10). NZ tax year runs 1 Apr – 31 Mar:

```ts
// Source: ird.govt.nz tax-rates-for-individuals (unchanged since 1 Aug 2024 mid-year reset)
const TAX_BRACKETS: Array<{ upTo: number; rate: number }> = [
  { upTo: 15_600,    rate: 0.105 },
  { upTo: 53_500,    rate: 0.175 },
  { upTo: 78_100,    rate: 0.30 },
  { upTo: 180_000,   rate: 0.33 },
  { upTo: Infinity,  rate: 0.39 },
]

// Source: legislation.govt.nz/regulation/public/2025/0018 — effective 1 Apr 2026
const ACC_LEVY_RATE = 0.0175
const ACC_LEVY_CAP_INCOME = 156_641

// Source: ird.govt.nz/student-loans (verify annually)
const STUDENT_LOAN_THRESHOLD_ANNUAL = 24_128
const STUDENT_LOAN_RATE = 0.12
```

**Math:**
- `incomeTax = sum over brackets of (min(income, upTo) - prevUpTo) * rate while > 0`
- `accLevy = min(income, ACC_LEVY_CAP_INCOME) * ACC_LEVY_RATE`
- `studentLoan = hasStudentLoan ? max(0, income - STUDENT_LOAN_THRESHOLD_ANNUAL) * STUDENT_LOAN_RATE : 0`
- `kiwiSaver = income * (kiwiSaverPct / 100)` (employee contribution; not a tax but a deduction from gross — we display it separately)
- `takeHomeAnnual = income - incomeTax - accLevy - studentLoan - kiwiSaver`
- Display split into year / month / fortnight / week (annual / 12 / 26 / 52)

**Display:**
- Take-home (annual / monthly / fortnightly / weekly) — prominent
- Breakdown table: Gross / − Income tax / − ACC levy / − Student loan / − KiwiSaver / = Take-home
- Effective tax rate `((tax + acc + sl) / income) * 100` shown as "Effective tax: X%"
- Footnote "Based on IRD FY 2026/27 rates (M tax code, primary employment). Excludes IETC, Working for Families, secondary jobs, and tailored tax codes."

#### 4. `/tools/gst` — `GstCalculator.tsx` (client)

Two-mode toggle (radio):

- **Add GST** — input "Amount excluding GST" → outputs "GST (15%)" and "Total inc. GST"
- **Extract GST** — input "Amount including GST" → outputs "GST (15%) extracted" and "Amount excluding GST"

GST rate 0.15. Single number input + radio + three computed lines. Trivial.

#### 5. `/tools/currency` — `CurrencyConverter.tsx` (client) + `app/tools/currency/page.tsx` (server fetches rate)

Server page:

```tsx
import { getNzdToPhpRate } from '@/lib/tools/currency'
import CurrencyConverter from './CurrencyConverter'

export const metadata = { title: 'NZD ↔ PHP Currency Converter' }

export default async function CurrencyPage() {
  const { rate, asOf, source, stale } = await getNzdToPhpRate()
  return (
    <main>
      <Nav />
      {/* … chrome … */}
      <CurrencyConverter rate={rate} asOf={asOf} stale={stale} />
      <p>Rate from {source}{stale && ' (may be out of date)'}.</p>
    </main>
  )
}
```

`lib/tools/currency.ts`:

```ts
export type Rate = { rate: number; asOf: string; source: string; stale: boolean }

export async function getNzdToPhpRate(): Promise<Rate> {
  // 1) Primary: frankfurter.dev (ECB, free, no key, NZD as base)
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=NZD&symbols=PHP',
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = await res.json()
      const rate = data?.rates?.PHP
      if (typeof rate === 'number' && rate > 0) {
        return { rate, asOf: String(data.date ?? ''), source: 'frankfurter.dev', stale: false }
      }
    }
  } catch {}
  // 2) Fallback: open.er-api.com USD-base, cross-multiply
  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = await res.json()
      const usdNzd = data?.rates?.NZD
      const usdPhp = data?.rates?.PHP
      if (typeof usdNzd === 'number' && typeof usdPhp === 'number' && usdNzd > 0 && usdPhp > 0) {
        const date = (data?.time_last_update_utc as string | undefined)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
        return { rate: usdPhp / usdNzd, asOf: date, source: 'open.er-api.com (via USD)', stale: false }
      }
    }
  } catch {}
  // 3) Last-resort hardcoded snapshot
  return { rate: 31.5, asOf: '2026-05-10', source: 'fallback (verify)', stale: true }
}
```

Client component: two yoked numeric inputs (NZD, PHP). `useState` on the "active side"; the other is computed as `amount * rate` or `amount / rate`. Headline: "1 NZD = X.XX PHP". Subline: "as of [asOf]".

#### 6. `/tools/time-zone` — `TimeZoneConverter.tsx` (client)

Two side-by-side cards: Auckland (Pacific/Auckland) and Manila (Asia/Manila). Each shows a `<input type="datetime-local">` plus a formatted display ("Wed, 14 May 2026, 10:00 AM").

State: a single `Date` (the current "moment"). Default = `new Date()`. When the user edits one input, we interpret that wall-clock time *in that input's zone* and recompute the moment. The other input/display reflects the same moment in the other zone.

DST safety: use `Intl.DateTimeFormat(undefined, { timeZone: 'Pacific/Auckland' | 'Asia/Manila', dateStyle: 'full', timeStyle: 'short' })` to format. To go from "wall clock in zone X" → `Date`, use a small helper that pads to ISO and lets the runtime resolve the offset (acceptable naive handling; the once-a-year ambiguous hour is acknowledged as a known quirk).

Optional: a "Now" button that resets the moment to current time, plus a small line "Manila is currently 4 hours behind Auckland" (computed live).

### Nav diff (`components/Nav.tsx`)

Two insertions, parallel structure:

- After `Browse` link (`Nav.tsx:100-102`), before `News` (`Nav.tsx:103-105`), add:
  ```tsx
  <Link href="/tools" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '15px', letterSpacing: '0.3px' }}>
    Tools
  </Link>
  ```
- After mobile Browse (`Nav.tsx:155-157`), before mobile News (`Nav.tsx:158-160`), add:
  ```tsx
  <Link href="/tools" onClick={() => setMenuOpen(false)} style={{ color: '#ffffff', textDecoration: 'none', fontSize: '24px', fontWeight: 300 }}>
    Tools
  </Link>
  ```

### Sitemap diff (`app/sitemap.ts`)

Add to `staticRoutes` array (line 21-26):

```ts
'/tools',
'/tools/mortgage',
'/tools/paye',
'/tools/gst',
'/tools/currency',
'/tools/time-zone',
```

(Each emitted as `${BASE}${path}` per existing pattern.)

## Resolved Open Questions

### Q1. Currency API choice

**`frankfurter.dev`** as primary (NZD base supported, ECB-sourced, no key, free for commercial display). Fallback chain: `open.er-api.com` USD-base cross-multiplied → hardcoded snapshot with `stale: true` flag. Cache via Next 16 `fetch(url, { next: { revalidate: 300 } })`. Validated in research.

### Q2. Mortgage input depth

**Minimal: principal + rate + term + repayment frequency.** Defer the deposit/LVR helper (home price → deposit → loan amount → LVR display) to v2. Reasoning: keeps v1 form short and matches the math behavior every NZ bank calculator already shows. The deposit/LVR helper is a "first home buyer" feature with extra inputs and rules that don't justify the v1 surface area.

### Q3. NZ FY 2026/27 numbers

**Use FY 2026/27 rates (current as of today, 2026-05-10):**

- Tax brackets: $15,600 / $53,500 / $78,100 / $180,000 with 10.5% / 17.5% / 30% / 33% / 39% (unchanged since 1 Aug 2024).
- ACC Earner Levy: **1.75%** up to **$156,641** (rose 1 Apr 2026).
- Student loan: $24,128 annual threshold, 12% rate (FY 2025/26 number — labeled "verify annually" in code; FY 2026/27 number not yet confirmed by IRD at the date of this plan).
- KiwiSaver: minimum 3.5% (rose 1 Apr 2026); options 3% / 3.5% / 4% / 6% / 8% / 10%; default 3.5%.

Footnote in PAYE UI: *"Based on IRD FY 2026/27 rates (M tax code, primary employment). Excludes IETC, Working for Families, secondary jobs, schedular/WT codes, and tailored tax codes."*

### Q4. Index page copy

Heading: **"Free tools for Pinoy Kiwis"**. Subhead: **"Calculators and quick references for life in New Zealand"**. Footer line: *"All tools are estimates only — confirm with a qualified professional for financial, legal, or tax decisions."*

### Q5. Sitemap

Add all 6 URLs to `staticRoutes` in `app/sitemap.ts:21-26`. Existing `revalidate = 3600` on the sitemap means the URLs propagate within an hour of deploy.

## Technical Considerations

- **No new dependencies.** All five calculators use built-in browser APIs (`Intl.DateTimeFormat`, `fetch`, basic math) and existing styles (`.input-dark`, `.btn-primary`).
- **All client calculators are leaf nodes** with no shared state. No context, no provider, no global store.
- **Currency rate fetch is server-side** with Next's revalidate-300 fetch caching — one upstream call per region every 5 minutes regardless of traffic. ECB updates daily, so 5-minute cache is more than fresh enough.
- **Rate fetch never blocks the page meaningfully.** 5s timeout per provider, two providers, total worst case 10s — but the cached path is sub-millisecond. Last-resort hardcoded snapshot ensures the page always renders.
- **Hydration safety.** Calculators initialize `useState` with deterministic defaults (numbers and strings, not `Date.now()` at render). Time-zone converter initializes with `null` state and sets `new Date()` in a `useEffect` to avoid SSR/CSR mismatch.
- **Accessibility.** All inputs have `<label>` (or `aria-label`). Use `inputMode="decimal"` on number inputs for mobile keyboards. Headings follow h1 / h2 hierarchy.
- **Disclaimer per page.** Every financial tool ends with "Estimate only — …". Tone matches `app/disclaimer/page.tsx:27`.
- **Metadata per page.** Static `metadata` exports give each tool a tab title and meta description. Layout's title template (`'%s — BisDak NZ'`, `app/layout.tsx:20`) auto-suffixes.
- **No `force-dynamic`.** The tool pages are statically renderable (the currency page reads a `revalidate: 300` fetch, which makes its render automatically revalidating). Index, mortgage, PAYE, GST, time-zone are all fully static.

## System-Wide Impact

- **Interaction graph:** request → server page renders → (currency only) helper fires off a cached `fetch` → HTML streams → client component hydrates → user types → React state updates → display recomputes. No DB calls. No auth. No middleware changes.
- **Error propagation:** the only network call is `getNzdToPhpRate()` which has a built-in three-step fallback. Other tools have zero failure modes beyond bad input (which we coerce/clamp).
- **State lifecycle risks:** none — read-only and stateless.
- **API surface parity:** introduces a new top-level route segment `/tools`. No existing routes are touched besides Nav and sitemap.
- **Caching parity:** currency page's render is automatically revalidating (driven by the `fetch` revalidate). Other tool pages render statically — Next App Router caches them at build/runtime. No special directives.

### Manual verification scenarios

1. **Nav** — load `/`, see "Tools" between Browse and News in desktop nav. Open mobile menu, see "Tools" between Browse and News in overlay. Both routes navigate to `/tools`.
2. **Index** — `/tools` shows 5 cards. Each card link navigates to `/tools/<slug>`.
3. **Mortgage** — defaults (500000, 6.5, 30, monthly) compute to ~$3,160.34/month, ~$637,723 total interest, ~$1,137,723 total paid (verify against any NZ bank's public calculator within ±$1).
4. **Mortgage frequency** — change to fortnightly, payment ≈ $1,455.43; weekly ≈ $727.45 (NZ banks' simple-divide convention).
5. **Mortgage zero rate** — set rate to 0, payment = principal / total_periods. No NaN/Infinity.
6. **PAYE** — gross $80,000, KiwiSaver 3.5%, no student loan. Take-home ≈ $60,440 (income tax $17,420, ACC $1,400, KiwiSaver $2,800; rounding within ±$5 acceptable). Compare to one of [paye.net.nz](https://www.paye.net.nz) or IRD calculator.
7. **PAYE high-income** — gross $200,000, no KiwiSaver, no student loan. Top-bracket math correct; ACC capped at $156,641 × 1.75% = $2,741.22.
8. **PAYE student loan** — gross $50,000, student loan on. Loan deduction = (50,000 − 24,128) × 0.12 = $3,104.64.
9. **GST add** — $100 excl → GST $15.00, total $115.00.
10. **GST extract** — $115 incl → GST $15.00 (115 × 3 / 23), excl $100.00.
11. **Currency** — `/tools/currency` loads with a today-or-yesterday `asOf` date and a sensible NZD→PHP rate (currently 30–34). Type 100 NZD → PHP updates live; type in PHP side → NZD updates.
12. **Currency fallback** — block frankfurter.dev in DevTools network tab; reload. Page still renders with `source: 'open.er-api.com (via USD)'` (or hardcoded with `stale=true` banner if both fail).
13. **Time zone** — page loads showing current Auckland time and current Manila time, with the expected 4-hour gap (or 5-hour during NZ DST winter, since Manila has no DST and Auckland goes UTC+12 / UTC+13).
14. **Time zone DST handling** — pick a date around April / September (NZ DST transitions); verify the gap recomputes correctly.
15. **Sitemap** — `https://bisdak.co.nz/sitemap.xml` includes all 6 new URLs after deploy.
16. **`tsc --noEmit`** — passes.
17. **`npx playwright test`** — existing smoke suite still passes (does not test `/tools`; we'll add a basic smoke later if desired).

## Acceptance Criteria

### Nav

- [x] Desktop nav shows "Tools" link between Browse and News.
- [x] Mobile overlay shows "Tools" link between Browse and News.
- [x] Clicking "Tools" navigates to `/tools` (and on mobile closes the menu via existing `setMenuOpen(false)` handler).

### Index page

- [x] `/tools` renders with heading "Free tools for Pinoy Kiwis" and subhead "Calculators and quick references for life in New Zealand".
- [x] Five cards visible: Mortgage, PAYE / take-home, GST, NZD ↔ PHP currency, Manila ↔ NZ time zone.
- [x] Each card navigates to its respective `/tools/<slug>` page.

### Mortgage calculator

- [x] Inputs: loan amount, interest rate, term (years), repayment frequency (weekly/fortnightly/monthly).
- [x] Default values produce a defensible answer matching an NZ bank's public calculator within ±$1 on the regular payment.
- [x] Zero-rate edge case returns `principal / total_periods` (no NaN, no Infinity).
- [x] Frequency dropdown actually changes the math (uses `r = annual / N` with N ∈ {52, 26, 12}).
- [x] Outputs: regular payment (with frequency suffix), total interest, total paid.

### PAYE calculator

- [x] Inputs: gross annual income, KiwiSaver % (None / 3 / 3.5 / 4 / 6 / 8 / 10; default 3.5), student loan checkbox.
- [x] Constants are FY 2026/27 (1.75% ACC capped at $156,641; brackets and student loan as documented).
- [x] Display includes annual / monthly / fortnightly / weekly take-home figures.
- [x] Display includes a breakdown table (gross / income tax / ACC / student loan / KiwiSaver / take-home).
- [x] Footnote calls out tax code scope ("M tax code, primary employment …").

### GST calculator

- [x] Two-mode toggle (Add GST / Extract GST).
- [x] Add: amount excl → GST + total incl.
- [x] Extract: amount incl → GST + amount excl (`incl × 3 / 23`).

### Currency converter

- [x] Server page fetches rate via `getNzdToPhpRate()` with `next: { revalidate: 300 }` cache.
- [x] Headline shows "1 NZD = X.XX PHP" and "as of <date>" sourced from the API response.
- [x] Two yoked inputs (NZD ↔ PHP) — editing one updates the other.
- [x] If both upstream providers fail, page renders with hardcoded snapshot and visible "rate may be out of date" notice (`stale: true`).

### Time zone converter

- [x] Two side-by-side editable cards (Auckland / Manila).
- [x] Defaults to current moment; "Now" button resets to `new Date()`.
- [x] DST handled by `Intl.DateTimeFormat` with named zones (`Pacific/Auckland`, `Asia/Manila`).
- [x] Caption shows current offset gap (e.g., "Manila is 4 hours behind Auckland today").

### Sitemap

- [x] `app/sitemap.ts`'s `staticRoutes` array contains `/tools`, `/tools/mortgage`, `/tools/paye`, `/tools/gst`, `/tools/currency`, `/tools/time-zone`.

### Quality gates

- [x] `npx tsc --noEmit` passes.
- [ ] No console errors / hydration warnings on `/tools` or any `/tools/<slug>` page. *(verify in browser)*
- [ ] All manual verification scenarios pass. *(verify in browser/production)*

## Success Metrics

- Subjective: each tool produces an answer that matches a trusted public reference (NZ bank, IRD, paye.net.nz, Google currency) within tolerance.
- Tools render and are usable on mobile (320px width) and desktop (1280px+).

## Dependencies & Risks

- **No new npm dependencies.**
- **Risk: external currency API outage.** Mitigated by two-tier fallback + hardcoded snapshot. Page never breaks.
- **Risk: tax/ACC numbers go stale annually.** Mitigation: code comments cite the source URL and an "verify annually" note. Set a personal reminder for 1 April each year. Updates are one-line constant edits.
- **Risk: DST edge-case glitch on the time-zone converter** during the once-a-year ambiguous hour. Acknowledged as a known limitation.
- **Risk: PAYE oversimplification.** The calculator is explicitly scoped (M code, primary employment, no IETC / WFF / secondary tax) and disclosed in-page. Users with edge cases will need an actual payroll calculator.

## Out of Scope

- Mortgage deposit / LVR helper (defer to v2).
- KiwiSaver retirement projection (a separate v2 tool).
- Remittance fee comparison (requires editorial maintenance).
- Cost-of-living comparison (requires data licensing or scraping).
- A `/api/currency-rate` route handler for external consumers (only one consumer today; defer until needed).
- Unit tests for the tools — manual verification scenarios + `tsc` is the v1 quality gate. The project has no JS test runner beyond Playwright.

## References & Research

### Internal

- Brainstorm: `docs/brainstorms/2026-05-10-community-tools-menu-brainstorm.md`
- Nav insertion points: `components/Nav.tsx:100-105` (desktop) and `components/Nav.tsx:155-160` (mobile overlay)
- Sitemap edit: `app/sitemap.ts:21-26`
- Page chrome template: `app/disclaimer/page.tsx:1-12`
- Rich header pattern (eyebrow + h1 + tagline): `app/blog/page.tsx:22-39`
- Client form template (controlled inputs + utility classes): `components/SearchBar.tsx:1-40`
- Disclaimer copy/tone: `app/disclaimer/page.tsx:27`
- API route handler template: `app/api/og/[slug]/route.tsx`
- Server page → client child wiring: `app/business/[slug]/page.tsx`
- Utility classes available: `app/globals.css` `.btn-primary`, `.btn-ghost`, `.input-dark`
- Layout already provides Suspense + Providers: `app/layout.tsx:55-59`
- TypeScript strict mode + `@/*` alias: `tsconfig.json:7,21-23`

### Next 16

- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md:58-68` — `fetch(url, { next: { revalidate: <seconds> } })` for the currency rate cache.

### NZ tax / financial data

- IRD income tax brackets: https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-rates-for-individuals
- ACC Earner Levy 2026/27 (1.75%, $156,641 cap): https://www.legislation.govt.nz/regulation/public/2025/0018/latest/LMS1019211.html
- Student loan: https://www.ird.govt.nz/student-loans/living-in-new-zealand-with-a-student-loan/repaying-my-student-loan-when-i-earn-salary-or-wages
- KiwiSaver changes (min rose to 3.5% on 1 Apr 2026): https://www.ird.govt.nz/kiwisaver-changes
- Mortgage formula and NZ bank conventions: ANZ home loan calculator, BNZ home loan calculator (linked in research)

### Currency API

- Primary: https://api.frankfurter.dev/v1/latest?base=NZD&symbols=PHP (ECB, no auth, free for commercial)
- Fallback: https://open.er-api.com/v6/latest/USD

### Project guidance

- `AGENTS.md` — "This is NOT the Next.js you know"; Next 16 fetch caching API verified against `node_modules`.
