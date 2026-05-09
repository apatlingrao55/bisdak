---
date: 2026-05-09
topic: business-card-pipeline
---

# Business Card Pipeline — Shareable Image + Enhanced UI Card

## What We're Building

### 1. Enhanced UI BusinessCard (`BusinessCard.tsx`)
- Add storefront photo (or category-based placeholder) at the top of each card
- Show contact details (phone, email, website) inline
- Show address/region
- Mobile-first — image and content stack vertically, auto-fit on small screens
- Keep the existing dark theme and styling patterns

### 2. Shareable OG Image Card (`/api/og/[slug]`)
- `@vercel/og` (Satori) endpoint generating a PNG per business
- Content: name, category, region, phone, email, website, Filipino-owned badge, storefront photo or placeholder
- BisDak branding + "bisdak.co.nz" watermark at the bottom
- Used as OG meta image on the detail page AND downloadable via a "Share Card" button
- Standard OG dimensions (1200x630)

## Why This Approach
- **Placeholder fallback for photos** — no API costs, owners can upload later
- **`@vercel/og` (Satori)** — lightweight, edge-compatible, JSX-based, doubles as OG social preview and downloadable card
- **Mobile-first UI** — cards stack vertically on small screens, consistent with existing dark theme

## Key Decisions
- No auto-fetching photos — placeholder/gradient with category icon when `photo_url` is null
- `@vercel/og` for image generation — single endpoint serves both OG meta and download
- Mobile-first responsive card layout
- Include all fields: name, category, region, phone, email, website, Filipino-owned badge, photo, BisDak watermark

## Open Questions
- None — scope is well-defined

## Next Steps
- `/workflows:plan` for implementation details
