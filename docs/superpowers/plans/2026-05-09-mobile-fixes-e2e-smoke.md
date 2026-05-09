# Mobile Fixes + E2E Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three mobile layout fit bugs at 375px and add a Playwright smoke test suite covering key public routes at both desktop and mobile viewports.

**Architecture:** Part 1 makes targeted inline-style/class changes to three components (Nav, CategoryGrid, BusinessCard). Part 2 installs Playwright, adds a config, and writes one test file that hits 6 routes across 2 viewport projects. Business detail slug is resolved from the rendered `/search` page in `beforeAll` to avoid DB coupling.

**Tech Stack:** Next.js 16, Tailwind CSS v4, Playwright (chromium only), TypeScript.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `components/Nav.tsx` | Wrap subtitle span in `hidden sm:inline` |
| Modify | `components/CategoryGrid.tsx` | `minmax(160px)` → `minmax(140px)` |
| Modify | `components/BusinessCard.tsx` | Add `flexWrap: 'wrap'` to header div |
| Modify | `package.json` | Add `@playwright/test` devDep + `test:smoke` script |
| Create | `playwright.config.ts` | Desktop + mobile projects, baseURL localhost:3000 |
| Create | `tests/smoke.spec.ts` | 6 route smoke tests with console error detection |

---

## Task 1: Fix Nav subtitle overflow on mobile

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Open `components/Nav.tsx` and find the logo Link (around line 20).** The current inner content is:

```tsx
🇵🇭 BisDak <span style={{ fontWeight: 400, color: '#A1A1AA' }}>— Pinoy Business Hub NZ</span>
```

- [ ] **Replace it with:**

```tsx
🇵🇭 BisDak{' '}
<span className="hidden sm:inline" style={{ fontWeight: 400, color: '#A1A1AA' }}>
  — Pinoy Business Hub NZ
</span>
```

- [ ] **Verify in browser at 375px** — resize Chrome DevTools to 375px. The nav should show `🇵🇭 BisDak` with the hamburger icon cleanly beside it. At 640px+ the subtitle should reappear.

- [ ] **Commit:**

```bash
git add components/Nav.tsx
git commit -m "fix(mobile): hide nav subtitle on small screens"
```

---

## Task 2: Fix CategoryGrid collapsing to 1 column on phones

**Files:**
- Modify: `components/CategoryGrid.tsx`

- [ ] **Open `components/CategoryGrid.tsx`.** Find the grid container style:

```tsx
gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
```

- [ ] **Change `160px` to `140px`:**

```tsx
gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
```

- [ ] **Verify in browser at 375px** — the category pills should render in 2 columns (~147px each). At 640px+ it should be 3+ columns as before.

- [ ] **Commit:**

```bash
git add components/CategoryGrid.tsx
git commit -m "fix(mobile): reduce category grid minmax to allow 2 columns on phones"
```

---

## Task 3: Fix BusinessCard badge cramming long names

**Files:**
- Modify: `components/BusinessCard.tsx`

- [ ] **Open `components/BusinessCard.tsx`.** Find the header `div` (around line 20) that wraps the business name `h3` and the Filipino-owned badge `span`. Its current style is:

```tsx
style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}
```

- [ ] **Add `flexWrap: 'wrap'` to that style object:**

```tsx
style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}
```

- [ ] **Verify in browser at 375px** — find or create a business with a long name (e.g. "Auckland Pinoy Catering & Events"). The name should render at full width and the 🇵🇭 Filipino-owned badge should wrap below it cleanly.

- [ ] **Commit:**

```bash
git add components/BusinessCard.tsx
git commit -m "fix(mobile): allow business name/badge to wrap on narrow screens"
```

---

## Task 4: Install Playwright and add npm script

**Files:**
- Modify: `package.json`

- [ ] **Install Playwright as a dev dependency (chromium only):**

```bash
cd /Users/openclaw/Projects/bisdak
npm install -D @playwright/test
npx playwright install chromium
```

Expected: `@playwright/test` appears in `devDependencies`. Chromium downloads (~120 MB).

- [ ] **Add the `test:smoke` script to `package.json`.** Open `package.json` and add to the `scripts` section:

```json
"test:smoke": "playwright test"
```

- [ ] **Commit:**

```bash
git add package.json package-lock.json
git commit -m "chore: install playwright for smoke tests"
```

---

## Task 5: Create Playwright config

**Files:**
- Create: `playwright.config.ts`

- [ ] **Create `playwright.config.ts` at the project root with this exact content:**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile',
      use: { viewport: { width: 375, height: 667 } },
    },
  ],
})
```

- [ ] **Commit:**

```bash
git add playwright.config.ts
git commit -m "chore: add playwright config (desktop + mobile projects)"
```

---

## Task 6: Write smoke tests

**Files:**
- Create: `tests/smoke.spec.ts`

- [ ] **Create `tests/` directory if it doesn't exist:**

```bash
mkdir -p /Users/openclaw/Projects/bisdak/tests
```

- [ ] **Create `tests/smoke.spec.ts` with this content:**

```typescript
import { test, expect, type Page } from '@playwright/test'

let businessSlug: string | null = null

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/search')
  const firstLink = page.locator('a[href^="/business/"]').first()
  const count = await firstLink.count()
  if (count > 0) {
    const href = await firstLink.getAttribute('href')
    businessSlug = href ?? null
  }
  await page.close()
})

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

test('home page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Lutong Pinoy')
  expect(errors).toHaveLength(0)
})

test('search page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search')
  await expect(page.locator('input[type="search"], input[name="q"]').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('search with category filter loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/search?category=food-dining')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('blog page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/blog')
  await expect(page.locator('h2').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('submit page loads', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/submit')
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toHaveLength(0)
})

test('business detail page loads', async ({ page }) => {
  if (!businessSlug) {
    test.skip(true, 'No active businesses in DB — skipping business detail smoke test')
    return
  }
  const errors = collectConsoleErrors(page)
  await page.goto(businessSlug)
  await expect(page.locator('h1').first()).toBeVisible()
  expect(errors).toHaveLength(0)
})
```

- [ ] **Commit:**

```bash
git add tests/smoke.spec.ts
git commit -m "test(smoke): add playwright smoke suite — 6 routes x desktop + mobile"
```

---

## Task 7: Run the smoke tests and verify they pass

**Prerequisites:** Dev server must be running (`npm run dev` in a separate terminal at port 3000).

- [ ] **Run the full smoke suite:**

```bash
cd /Users/openclaw/Projects/bisdak
npm run test:smoke
```

Expected output: 12 tests pass (6 routes × 2 viewport projects). `business detail` may show as skipped if DB is empty — that's correct behaviour.

- [ ] **If any test fails:** Check the route manually in the browser at the failing viewport. Common causes:
  - Selector mismatch — e.g. the `h1` on the home page renders before JS hydration. Add `await page.waitForSelector('h1')` before the expect if needed.
  - Console errors from a missing env var — check `.env.local` is loaded.

- [ ] **If all pass, you're done.** No further commits needed.
