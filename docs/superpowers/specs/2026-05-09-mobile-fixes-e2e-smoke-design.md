# Design: Mobile Layout Fixes + E2E Smoke Tests

**Date:** 2026-05-09  
**Status:** Approved

## Overview

Two independent improvements: (1) fix three specific mobile layout fit issues found at 375px, and (2) add a Playwright smoke test suite that validates key pages at both desktop and mobile viewports.

---

## Part 1: Mobile Layout Fixes

### Problem

Three components break at 375px (iPhone SE / standard small phone):

1. **Nav** — `🇵🇭 BisDak — Pinoy Business Hub NZ` at 17px overflows into the hamburger icon due to 32px side padding leaving only ~311px of usable width.
2. **CategoryGrid** — `minmax(160px, 1fr)` with 16px gap and 24px side padding (327px usable) cannot fit 2 columns (would require 155.5px each, below the 160px minimum), so auto-fill collapses to 1 column.
3. **BusinessCard** — Header row uses `justifyContent: space-between` with `flexShrink: 0` on the badge. Long business names get crushed rather than the badge wrapping.

### Fixes

**`components/Nav.tsx`**  
Wrap the subtitle in `<span className="hidden sm:inline">` so it renders on `sm` (640px+) and above, hiding on phones. The logo becomes just `🇵🇭 BisDak` on mobile.

```tsx
<Link href="/" ...>
  🇵🇭 BisDak{' '}
  <span className="hidden sm:inline" style={{ fontWeight: 400, color: '#A1A1AA' }}>
    — Pinoy Business Hub NZ
  </span>
</Link>
```

**`components/CategoryGrid.tsx`**  
Change `minmax(160px, 1fr)` → `minmax(140px, 1fr)`. At 375px this gives 2 columns of ~147px. Pill items (icon + short label) are readable at that width.

**`components/BusinessCard.tsx`**  
Add `flexWrap: 'wrap'` to the name/badge header div. On narrow screens a long name takes full width and the badge wraps to its own line. Desktop is unaffected — names are rarely long enough to trigger the wrap at 1280px.

### Constraints

- No changes to desktop layout
- No new CSS files or Tailwind config changes
- Changes are self-contained to the three component files

---

## Part 2: E2E Smoke Tests

### Goal

Verify that all key public routes return a rendered page with expected content at both desktop and mobile viewports. Not a functional test — no form submissions, no auth flows, no interaction beyond page load.

### Stack

- **Playwright** (`@playwright/test`) — dev dependency
- **Browser:** Chromium only (fast install, sufficient for smoke)
- **Viewports:** desktop 1280×720, mobile 375×667

### Configuration (`playwright.config.ts`)

```ts
export default defineConfig({
  testDir: './tests',
  baseURL: 'http://localhost:3000',
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile',  use: { viewport: { width: 375,  height: 667 } } },
  ],
})
```

No `webServer` — dev server runs separately with `npm run dev`.

Add to `package.json`:
```json
"test:smoke": "playwright test"
```

### Test File (`tests/smoke.spec.ts`)

Six routes, each asserting page load + a key visible element. Console error collection on each test — fail if any uncaught JS error appears.

| Route | Key assertion |
|---|---|
| `/` | First slide heading visible (`h1` containing "Lutong Pinoy") |
| `/search` | Search input visible |
| `/search?category=food-dining` | Results section or "no results" text visible |
| `/blog` | `h2` containing "News" visible |
| `/submit` | Submit form heading visible |
| `/business/[slug]` | Business name heading (`h1`) visible |

**Business detail slug:** Retrieved once in `test.beforeAll` via direct SQLite query (`better-sqlite3`) against `filipinohub.db`. Test is skipped gracefully if no active businesses exist.

### Files Created

```
playwright.config.ts
tests/
  smoke.spec.ts
```

### Not in scope

- Auth flows (sign in, dashboard)
- Admin pages
- Form submissions
- Visual regression / screenshot comparison
- CI pipeline integration (local-only for now)
