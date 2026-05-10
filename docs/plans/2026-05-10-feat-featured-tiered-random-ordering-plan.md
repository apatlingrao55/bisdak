---
title: Tiered random ordering for featured business cards
type: feat
status: completed
date: 2026-05-10
---

# Tiered Random Ordering for Featured Business Cards

## Overview

Replace the home page's "Recently Added" section ordering (`createdAt DESC` with `isPremium DESC` priority) with a strict three-tier priority + random-within-tier order:

1. **Tier 1 — Premium** (`is_premium = true`)
2. **Tier 2 — With photo** (`is_premium = false AND photo_url IS NOT NULL AND photo_url <> ''`)
3. **Tier 3 — No photo** (everything else)

Within each tier the order is random per request. The existing 6-card limit is unchanged; tiers fill in priority order with no quotas.

Two files change:

- `lib/db/queries.ts` — extend `getBusinessCards`'s `orderBy` union with `'featured'`. In featured mode, the orderBy chain becomes a single `CASE` expression + `RANDOM()`.
- `app/page.tsx` — call with `orderBy: 'featured'`, swap `export const revalidate = 300` for `export const dynamic = 'force-dynamic'`, and update the section heading copy.

Brainstorm: `docs/brainstorms/2026-05-10-tiered-random-business-cards-brainstorm.md`.

## Problem Statement / Motivation

Today the home featured section is sorted by `desc(isPremium), desc(createdAt)` with a 5-minute ISR cache (`app/page.tsx:1`). Two effects compound:

- The same handful of "newest premium business" cards sit at the top until a newer one is added or the section turns over slowly.
- The 5-minute cache means the same set of 6 cards is served to every visitor in any given window — there is no rotation at all for non-premium businesses.

The result is unequal exposure across the directory: a few businesses are always at the top, the rest never surface on the home page even when they have photos and complete profiles. Tiered priority preserves the commercial value of `isPremium` and rewards businesses that uploaded a photo, but randomizes within each tier so businesses in the same tier get roughly equal home-page exposure across visits.

## Proposed Solution

### `lib/db/queries.ts` change

Current (`lib/db/queries.ts:39-84`):

```ts
export async function getBusinessCards(options?: {
  limit?: number
  conditions?: SQL[]
  orderBy?: 'newest' | 'alpha'
}) {
  const { limit, conditions = [], orderBy = 'newest' } = options ?? {}
  const allConditions: SQL[] = [eq(businesses.status, 'active') as SQL, ...conditions]
  const order = orderBy === 'alpha' ? asc(businesses.name) : desc(businesses.createdAt)
  let query = db
    .select({ /* … */ })
    /* joins, where, groupBy … */
    .orderBy(desc(businesses.isPremium), order)
    .$dynamic()
  if (limit) query = query.limit(limit)
  return query
}
```

Proposed:

```ts
export async function getBusinessCards(options?: {
  limit?: number
  conditions?: SQL[]
  orderBy?: 'newest' | 'alpha' | 'featured'
}) {
  const { limit, conditions = [], orderBy = 'newest' } = options ?? {}
  const allConditions: SQL[] = [eq(businesses.status, 'active') as SQL, ...conditions]

  let query = db
    .select({ /* unchanged */ })
    /* joins, where, groupBy unchanged */
    .$dynamic()

  if (orderBy === 'featured') {
    query = query.orderBy(
      sql`CASE
            WHEN ${businesses.isPremium} THEN 0
            WHEN ${businesses.photoUrl} IS NOT NULL AND ${businesses.photoUrl} <> '' THEN 1
            ELSE 2
          END`,
      sql`RANDOM()`,
    )
  } else {
    const order = orderBy === 'alpha' ? asc(businesses.name) : desc(businesses.createdAt)
    query = query.orderBy(desc(businesses.isPremium), order)
  }

  if (limit) query = query.limit(limit)
  return query
}
```

Notes:

- The existing `desc(businesses.isPremium)` is preserved for `'newest'` and `'alpha'` modes (unchanged behavior). For `'featured'` mode, the CASE expression already encodes premium-first, so adding `desc(isPremium)` would be redundant.
- `sql` is already imported on line 4 (`import { ..., sql } from 'drizzle-orm'`); same precedent in lines 67–68 (`sql\`COALESCE(AVG(${reviews.rating}), 0)\``).
- The `$dynamic()` marker stays so the conditional branch reassignment compiles.
- Postgres-specific `RANDOM()` is fine — the project uses `postgres@3.4.9`. Same RANDOM idiom would not port to MySQL, but that's not a constraint today.

### `app/page.tsx` change

Three small edits:

1. **Line 1** — `export const revalidate = 300` → `export const dynamic = 'force-dynamic'`. Mirrors `app/search/page.tsx:1`. Required so `RANDOM()` runs on every request instead of being frozen by ISR for 5 minutes.
2. **Line 23** — `await getBusinessCards({ limit: 6 })` → `await getBusinessCards({ limit: 6, orderBy: 'featured' })`.
3. **Lines 47, 50** — heading copy update to match new behavior:
   - `Recently Added` → `Featured Businesses`
   - `The latest Pinoy businesses listed on BisDak` → `Pinoy businesses to discover today`

### What we do NOT change

- `app/search/page.tsx` — search continues to default to `'newest'` and offer `'newest' | 'alpha'`. The `'featured'` enum value is added but not exposed in the sort `<select>`. Out of scope.
- `app/admin/page.tsx:90` — admin's `desc(isPremium), desc(createdAt)` ordering is correct for an operator dashboard. Untouched.
- `BusinessCard.tsx`, `lib/db/schema.ts` — no changes.

## Resolved Open Questions

### Q1. `photoUrl` null-vs-empty

**Decision:** `photo_url IS NOT NULL AND photo_url <> ''` (defensive). The repo's edit handler (`app/api/businesses/[slug]/edit/route.ts:74`) already coerces empty input to `null`, so today only `NULL` is in the DB — but the cost of being defensive against future code paths or manual DB edits is zero.

### Q2. Caching strategy

**Decision:** `export const dynamic = 'force-dynamic'` at the route level (`app/page.tsx:1`). Reasons:

- Matches `app/search/page.tsx:1` precedent (consistent with how this project opts out of static rendering).
- More discoverable than `unstable_noStore()` inside the query (which is now legacy in Next 15+; the recommended replacement is `connection`, but `force-dynamic` remains the standard route-level approach since `cacheComponents` is not enabled in `next.config.ts`).
- Per `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:97`, `force-dynamic` is equivalent to `cache: 'no-store'` + `revalidate: 0` + `fetchCache: 'force-no-store'`. Exactly what we want.

Trade-off: the home page also re-renders the hero, categories, and latest posts on every request. That's small extra work (queries are tiny, hero is video, categories rarely change), and it's the simplest model. Acceptable.

### Q3. Future search extension

**Decision:** Out of scope. The new `'featured'` enum value is added to `getBusinessCards`'s `orderBy` union and works correctly with `conditions` (search filters) and `limit`. If we later want a "featured" option in the search sort, the change is a one-line addition to the `<select>` in `app/search/page.tsx:107-110`. Pagination caveat (random sort + offset can show duplicates across pages) would need to be addressed at that time — irrelevant to the home page's single, unpaginated 6-card list.

## Technical Considerations

- **Performance.** `ORDER BY <CASE>, RANDOM() LIMIT 6` over the `businesses` table is fast at any reasonable scale. The CASE expression is a constant-time expression evaluated per row; `RANDOM()` adds a per-row scalar; `ORDER BY` then needs a top-N sort which is O(N log K) for K=6. With 33 seed rows it's trivial; even at 10K rows it's milliseconds. If the table later grows past 100K rows we can revisit (e.g., approximate sampling), but that's well in the future.
- **No new imports.** `sql`, `desc`, `asc`, `eq` are all already imported in `lib/db/queries.ts:4`.
- **Seed-state observability.** All 33 seed rows have `photoUrl = NULL`, so locally Tier 2 will be empty until photos are added. Premium rows will fill the home featured slots; non-premium will fall to Tier 3. Document in the verification scenarios so this isn't mistaken for a bug.
- **TypeScript.** Extending the union to `'newest' | 'alpha' | 'featured'` is non-breaking — only one consumer (`app/page.tsx`) opts into the new value; `app/search/page.tsx` still narrows to `'newest' | 'alpha'` via its ternary.

## System-Wide Impact

- **Interaction graph:** request to `/` → server component renders → `getBusinessCards({ limit: 6, orderBy: 'featured' })` → single Postgres query with the CASE+RANDOM ORDER BY → 6 rows → mapped to `<BusinessCard>` → HTML streamed. No callbacks, no middleware changes, no observers.
- **Error propagation:** if the query fails (DB connection error), the server component throws → Next renders the nearest error boundary. Same as today; not changed.
- **State lifecycle risks:** none — read-only.
- **API surface parity:** `getBusinessCards` is the single entry point for card-shaped data. Admin uses a different shape and is unaffected.
- **Caching parity:** consistent with `app/search/page.tsx`'s `force-dynamic`. No edge/CDN caching surprises beyond what already exists for search.

### Manual verification scenarios

1. **Hard reload home page repeatedly** — order of the 6 featured cards changes each reload. Premium cards always come first; with-photo cards next; no-photo last (no Tier 2 today on local seed; that's expected).
2. **Premium-only seed (current state):** all 6 cards are premium-tier rows in random order each load.
3. **Add a photo to one non-premium row in DB**, reload home → it surfaces ahead of any non-premium without-photo rows.
4. **Set `is_premium = true` on every business** → all 33 cards are eligible for the top 6, randomized each reload.
5. **Search page** (`/search`) — sort `<select>` still shows only "Newest" and "Alphabetical"; default ordering matches today (premium first, then newest). No regression.
6. **Admin page** — premium-first ordering unchanged (`app/admin/page.tsx:90`).
7. **Smoke test** (`tests/smoke.spec.ts`) — `npx playwright test` continues to pass; the test only asserts a card is visible, not order.
8. **`tsc --noEmit`** — passes.

## Acceptance Criteria

- [x] `getBusinessCards`'s `orderBy` accepts `'newest' | 'alpha' | 'featured'`.
- [x] In `'featured'` mode, the SQL ORDER BY is exactly: `CASE WHEN is_premium THEN 0 WHEN photo_url IS NOT NULL AND photo_url <> '' THEN 1 ELSE 2 END, RANDOM()`.
- [x] In `'newest'` and `'alpha'` modes, the SQL ORDER BY is unchanged (`is_premium DESC, <created_at DESC | name ASC>`).
- [x] `app/page.tsx` calls `getBusinessCards({ limit: 6, orderBy: 'featured' })`.
- [x] `app/page.tsx` declares `export const dynamic = 'force-dynamic'` and no longer declares `revalidate`.
- [x] Home section heading reads "Featured Businesses" with subhead "Pinoy businesses to discover today".
- [ ] Reloading the home page produces a different order across reloads (verified manually). *(verify in browser)*
- [x] `npx tsc --noEmit` passes.
- [x] `app/search/page.tsx` and `app/admin/page.tsx` orderings unchanged.
- [ ] No console errors or hydration warnings on `/`. *(verify in browser)*

## Success Metrics

- Subjective: reload `/` three times — see a fresh order each time, with premium cards leading and any non-premium-with-photo placed before any non-premium-without-photo.
- No regression in home-page TTFB beyond the loss of ISR caching (~10–50ms increase per request from running 4 small queries instead of serving cached HTML — acceptable for the directory feel of fresh-every-visit).

## Dependencies & Risks

- **No new dependencies.**
- **Risk: home page is now uncached.** Mitigation: queries are small and indexed; hero video is a static file. If TTFB regresses noticeably, revisit with `unstable_cache` around the non-random parts (categories, latest posts).
- **Risk: `RANDOM()` performance at scale.** Mitigation: monitor row count growth. At 100K+ rows, switch to a sampling approach (`TABLESAMPLE`, or `ORDER BY md5(id || day)` for daily rotation). Not a near-term concern.
- **Risk: heading copy decision is subjective.** Mitigation: changes are one-line edits; trivially reversible if the user prefers different wording.
- **Risk: a returning visitor expects the same cards they saw before.** Acceptable — the brainstorm explicitly chose per-page-load shuffle for maximum exposure rotation.

## Out of Scope

- Quota-based tier composition (e.g., "always show 2 premium + 2 with-photo + 2 no-photo").
- Per-session or per-day shuffle (rejected in brainstorm in favor of per-request).
- Adding "featured" to the search page's sort `<select>`.
- Pagination support for the `'featured'` mode.
- Changes to `BusinessCard.tsx` or `app/admin/page.tsx`.

## References & Research

### Internal

- Brainstorm: `docs/brainstorms/2026-05-10-tiered-random-business-cards-brainstorm.md`
- `lib/db/queries.ts:39-84` — `getBusinessCards` (extend `orderBy` union; branch the orderBy chain)
- `lib/db/queries.ts:4` — existing imports of `sql`, `asc`, `desc`, `eq` (no new imports needed)
- `lib/db/queries.ts:67-68` — existing `sql` template literal precedent
- `lib/db/schema.ts:40,42` — `photoUrl` (nullable text), `isPremium` (boolean default false)
- `app/page.tsx:1,23,47,50` — caching directive, call site, heading, subhead
- `app/search/page.tsx:1` — `force-dynamic` precedent
- `app/admin/page.tsx:90` — premium-first sort precedent (unchanged)
- `app/api/businesses/[slug]/edit/route.ts:74` — coerces empty `photoUrl` to `null` (informs Tier 2 predicate)
- `tests/smoke.spec.ts:36-45` — home test (does not pin order; will continue to pass)

### Next 16 docs (read from node_modules per AGENTS.md)

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md` — `export const dynamic = 'force-dynamic'` semantics; legacy directives still active without Cache Components.
- `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:97` — `force-dynamic` ≡ `cache: 'no-store'` + `revalidate: 0`.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_noStore.md:7` — `unstable_noStore` is legacy; `connection` is the modern replacement. We're using route-level `force-dynamic` instead — simpler and consistent with the rest of the codebase.

### Project guidance

- `AGENTS.md` — "This is NOT the Next.js you know"; Next 16 caching API surface verified against `node_modules`. `next.config.ts` does NOT enable `cacheComponents`, so `dynamic`/`revalidate` route segment configs remain in force.
