---
date: 2026-05-09
topic: premium-businesses
---

# Premium / Featured Businesses

## What We're Building

Paying customers' businesses always appear at the top of listings — homepage, search results, and category browsing. Premium businesses get a subtle "Featured" badge on their card. Admin can toggle premium status manually now; Stripe self-service planned for later.

## Why This Approach

A single `is_premium` boolean on the `businesses` table is the simplest possible implementation. It requires one column, one sort change, one badge, and one admin toggle. No new tables, no payment integration, no expiration logic. When Stripe is added later, it just flips this boolean.

## Key Decisions

- **Placement**: Premium businesses float to top everywhere (homepage, search, category browse)
- **Visual**: Subtle "Featured" badge on BusinessCard — not intrusive
- **Management**: Admin toggle in admin panel for now, Stripe self-service later
- **Sort logic**: `ORDER BY is_premium DESC, <existing_order>` — premium first, then normal sort within each group
- **No tiers**: Just on/off, no bronze/silver/gold complexity
- **No expiration**: Manual un-premium for now, automated when Stripe is added

## Open Questions

- Badge design: star icon vs text label vs colored border accent
- Should premium businesses also get a badge on their detail page?

## Next Steps

-> `/workflows:plan` for implementation details
