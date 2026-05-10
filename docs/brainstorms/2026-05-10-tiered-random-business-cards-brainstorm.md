---
date: 2026-05-10
topic: tiered-random-business-cards
---

# Tiered Random Ordering for Business Cards (Home Featured Section)

## What We're Building

The home page featured section (`app/page.tsx`, currently `getBusinessCards({ limit: 6 })`) becomes a **strict-priority, randomized-within-tier** list. Every page load reshuffles the order.

Tier order:

1. **Premium** — `isPremium = true` (column at `lib/db/schema.ts:42`).
2. **With photo** — not premium AND `photoUrl` is non-null and non-empty.
3. **No photo** — everything else.

Within each tier, ordering is random per request. The 6-card limit is filled by strict priority: premium first, then with-photo if room remains, then no-photo. No quotas.

Scope: **home page only**. Search results keep their existing `newest` / `alpha` sort options unchanged.

## Why This Approach

The user's read of the problem: every visitor sees the same alphabetical/newest top of the list, so the same handful of businesses always appear up top. Tiered priority preserves the commercial value of `isPremium` and the visual quality bump that comes from having a photo, while randomizing within each tier gives businesses in the same tier roughly equal exposure across many visits.

Three composition strategies were considered: strict-priority-then-shuffle (chosen), per-tier quotas, and expanding the 6-card limit. Quotas were rejected as premature — they'd guarantee visibility for non-premium even when premium is plentiful, but that's not the stated goal and it adds tunable knobs that are hard to set well today. Expanding the limit was rejected as out of scope.

Three "cycle" granularities were considered: shuffle every page load (chosen), daily rotation, and per-session shuffle. The user picked per-page-load for maximum exposure rotation; the price is giving up static caching of the home page.

## Key Decisions

- **Tier definition:**
  - Tier 1: `isPremium = true`
  - Tier 2: `isPremium = false AND photoUrl IS NOT NULL AND photoUrl <> ''`
  - Tier 3: everything else
- **Composition:** strict priority, no quotas. Premium fills first; spillover fills next tier.
- **Cycle granularity:** shuffle every request. Implies the home page must render dynamically (no static caching) — Next 16 `export const dynamic = 'force-dynamic'` or `unstable_noStore()` inside the query.
- **Scope:** `app/page.tsx` featured section only. Search page is not touched in this change.
- **Implementation locus:** likely a new mode in `getBusinessCards` (e.g., `orderBy: 'featured'`) that emits a single SQL query with `ORDER BY <tier_priority>, RANDOM() LIMIT 6`. Postgres-specific `RANDOM()` is fine — the project already uses Postgres via Drizzle.

## Open Questions

- **Empty-string photoUrl:** confirm during planning whether `photoUrl` is consistently `NULL` for "no photo" or whether some rows have `''`. The Tier 2 predicate must handle both.
- **Caching strategy:** `export const dynamic = 'force-dynamic'` on the home route vs. `unstable_noStore()` inside `getBusinessCards`. Pick one in the plan; the route-level export is more discoverable.
- **Future extension to search:** if search later wants the same tiered shuffle, `getBusinessCards({ orderBy: 'featured' })` becomes the entry point — verify the new mode composes with search's `limit`/`offset` pagination semantics. Out of scope for this change.

## Next Steps

→ `/workflows:plan` for implementation details (exact Drizzle query, the home-page rendering directive, and verification scenarios).
