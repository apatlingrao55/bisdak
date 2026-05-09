---
date: 2026-05-09
topic: business-landing-page
---

# Business Detail Page — One-Page Advert Redesign

## What We're Building

Redesign the business detail page (`/business/[slug]`) from a directory listing into a full-bleed one-page landing page / advert. Each business page should feel like the business's own mini-website.

Layout (top to bottom, full viewport width):

1. **Hero banner** — Full-width business photo (or category-colored placeholder with icon). Business name, badges (Featured, Filipino-owned), and open status overlaid on the image.
2. **About section** — Business description in large readable text, centered.
3. **Contact strip** — Big tappable buttons for phone, email, website, Facebook, Google Maps, share, and claim.
4. **Embedded map** — Google Maps iframe showing the business location (extracted from googleMapsUrl).
5. **Reviews section** — Existing review form + review list, same functionality.

## Why This Approach

Full-bleed sections create a landing-page feel without adding complexity. No new data fields needed — everything uses existing schema fields (photoUrl, description, googleMapsUrl, etc.). The embedded map uses Google Maps iframe embed which requires no API key.

## Key Decisions

- **Hero**: Use existing `photoUrl` as full-width banner (300-400px tall), with gradient overlay for text readability
- **Map embed**: Extract place query from `googleMapsUrl` and use `maps.google.com/maps?q=...&output=embed` iframe. No API key required.
- **Layout**: Full viewport width sections, no max-width container on section backgrounds
- **Mobile**: Everything stacks naturally since sections are already full-width
- **No new DB fields**: Everything uses existing business data

## Open Questions

- None — straightforward layout change

## Next Steps

-> `/workflows:plan` for implementation details
