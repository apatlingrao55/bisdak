---
title: "feat: Premium / Featured Businesses"
type: feat
status: active
date: 2026-05-09
---

# Premium / Featured Businesses

## Overview

Add an `is_premium` boolean to businesses so paying customers always appear at the top of all listings (homepage, search, browse). Premium businesses show a subtle "Featured" badge. Admin can toggle premium status from the admin panel.

## Acceptance Criteria

- [ ] `is_premium` column added to `businesses` table (boolean, default false)
- [ ] Premium businesses sort before non-premium everywhere (homepage, search, browse)
- [ ] Within premium and non-premium groups, existing sort order is preserved
- [ ] BusinessCard shows a subtle "Featured" badge when `isPremium` is true
- [ ] Admin panel has a toggle to mark/unmark businesses as premium
- [ ] API endpoint to toggle premium status (POST /api/admin/businesses/[id]/premium)
- [ ] Business detail page shows a "Featured" indicator

## Implementation Steps

### 1. Database Migration

Add column via raw SQL (Supabase):

```sql
ALTER TABLE businesses ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;
```

### 2. Schema Update — `lib/db/schema.ts`

Add to businesses table:

```ts
isPremium: boolean('is_premium').default(false),
```

### 3. Query Update — `lib/db/queries.ts`

Change `getBusinessCards` ordering:

```ts
// Before
const order = orderBy === 'alpha' ? asc(businesses.name) : desc(businesses.createdAt)
// ...
.orderBy(order)

// After
const order = orderBy === 'alpha' ? asc(businesses.name) : desc(businesses.createdAt)
// ...
.orderBy(desc(businesses.isPremium), order)
```

Add `isPremium` to both select projections (`getBusinessBySlug` and `getBusinessCards`).

### 4. BusinessCard Badge — `components/BusinessCard.tsx`

Add a "Featured" badge when `business.isPremium`:

```tsx
{business.isPremium && (
  <span style={{
    background: 'rgba(251,191,36,0.12)',
    color: '#FBBF24',
    border: '1px solid rgba(251,191,36,0.25)',
    borderRadius: '9999px',
    padding: '2px 10px',
    fontSize: '11px',
    fontWeight: 600,
  }}>
    Featured
  </span>
)}
```

### 5. Business Detail Badge — `app/business/[slug]/page.tsx`

Show "Featured Business" badge alongside Filipino-owned badge in the hero section.

### 6. Admin API — `app/api/admin/businesses/[id]/premium/route.ts`

```ts
POST /api/admin/businesses/[id]/premium
Body: { isPremium: boolean }
```

Protected by `isAdmin()`. Updates the `is_premium` column.

### 7. Admin Panel Toggle — `app/admin/page.tsx` or `BusinessFilter.tsx`

Add a toggle/button next to each business in the "All Businesses" list to flip premium status.

## Files Changed

| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add `isPremium` column |
| `lib/db/queries.ts` | Add `isPremium` to selects, update `orderBy` |
| `components/BusinessCard.tsx` | Add "Featured" badge |
| `app/business/[slug]/page.tsx` | Add "Featured" badge in hero |
| `app/api/admin/businesses/[id]/premium/route.ts` | New — toggle endpoint |
| `app/admin/page.tsx` or `app/admin/BusinessFilter.tsx` | Add premium toggle UI |

## References

- Brainstorm: `docs/brainstorms/2026-05-09-premium-businesses-brainstorm.md`
- Existing sort logic: `lib/db/queries.ts:47`
- BusinessCard component: `components/BusinessCard.tsx`
- Admin business list: `app/admin/BusinessFilter.tsx`
