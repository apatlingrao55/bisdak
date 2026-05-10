---
date: 2026-05-10
topic: community-tools-menu
---

# Community Tools Menu — v1

## What We're Building

A new "Tools" section of BisDak NZ for the Filipino community in New Zealand. A single "Tools" link in the Nav (placed between **Browse** and **News**, both desktop and mobile overlay) navigates to `/tools` — a card-grid index page listing all available tools. Each tool lives at its own URL `/tools/<slug>` as a small client-side calculator.

**v1 launches with five tools:**

1. **Mortgage calculator** (`/tools/mortgage`) — principal, rate, term → monthly repayment, total interest, total paid.
2. **PAYE / take-home calculator** (`/tools/paye`) — gross income → take-home pay using current NZ tax brackets, ACC earner levy, optional KiwiSaver and student loan deductions.
3. **GST calculator** (`/tools/gst`) — 15% GST inclusive/exclusive in both directions.
4. **NZD ↔ PHP currency converter** (`/tools/currency`) — live rate via a free no-auth API (e.g., open.er-api.com or frankfurter.app), with "as of" timestamp and graceful fallback if the API is down.
5. **Manila ↔ NZ time zone converter** (`/tools/time-zone`) — pick a date/time in one zone, see the equivalent in the other. DST-safe via `Intl.DateTimeFormat` with `Asia/Manila` / `Pacific/Auckland`.

All tools are client components (they need interactivity). The `/tools` index is server-rendered and lists each tool by icon, name, and a one-line description.

## Why This Approach

The site already has a strong "directory" identity. Adding tools that solve *recurring practical problems* for the audience (mortgages, payslips, sending money home, calling family in Manila) compounds the site's utility without requiring any new content discovery. The tools are also "evergreen" — once built, they don't decay or need editorial updates (except the currency API and PAYE bracket data when budgets change).

**Single Nav link → `/tools` index** chosen over a dropdown menu because:

- Mobile-first — dropdowns are awkward on touch (tap-to-expand needs careful UX, hover doesn't exist).
- Future-proof — adding a new tool later only needs a new page + index entry; no Nav edits.
- The index page itself is useful (icons + descriptions help users discover tools).

Tool selection prioritized **simple math + free-or-no-data** over more ambitious tools (remittance fee comparison, cost-of-living) which require ongoing data freshness work and were deferred.

## Key Decisions

- **Nav placement:** "Tools" link between "Browse" and "News" in both `Nav.tsx`'s desktop nav and mobile overlay.
- **URL pattern:** `/tools` (index) and `/tools/<slug>` (per tool). Slugs: `mortgage`, `paye`, `gst`, `currency`, `time-zone`.
- **Rendering:** index is server-rendered. Each tool page is a `'use client'` component (small forms with live calculation).
- **Visual style:** matches existing site — dark theme, `.btn-primary` and `.input-dark` utility classes from `app/globals.css`, on-brand `#36F4A4` accents.
- **Currency API:** free no-auth source (open.er-api.com or frankfurter.app — pick during planning). Cache the response for ~5 minutes to be polite. On API failure, show last-known cached rate + a non-blocking "rate may be stale" notice.
- **PAYE math:** use current NZ FY 2025/26 brackets and ACC earner levy. Verify exact rates during planning. KiwiSaver and student-loan deductions are optional checkboxes.
- **Time zone:** rely on `Intl.DateTimeFormat` with named zones. NZ observes DST (Pacific/Auckland), Philippines does not (Asia/Manila) — let `Intl` handle the transitions; do not hard-code offsets.
- **Disclaimer:** every financial tool gets a one-line "Estimate only — confirm with a professional" line at the bottom. Reuses the tone of `app/disclaimer/page.tsx`.

## Open Questions

- **Currency API choice:** open.er-api.com vs frankfurter.app vs other. Decide in plan based on uptime track record and rate-limit policy.
- **Mortgage inputs depth:** keep it minimal (principal + rate + term) or add deposit-and-LVR ("how much do I need to put down to buy a $X home with a 20% deposit?"). Pick during planning — minimal is fine for v1.
- **PAYE FY numbers:** confirm current brackets, ACC earner levy rate and cap, student-loan threshold and rate. Not blocking; just data lookup.
- **Index page copy:** should the page have a section heading like "Free tools for the Pinoy community in NZ"? Pick during planning.
- **Sitemap inclusion:** add `/tools` and `/tools/<slug>` URLs to `app/sitemap.ts` so they're indexed. Trivial; remember in plan.
- **Footer / "View all tools" link:** decide later whether to add a footer link or a "Browse our tools →" CTA on the home page. Out of scope for v1; add when there's a fuller tool set.

## Next Steps

→ `/workflows:plan` for implementation details (exact file structure, calculator math, currency API contract, Nav diff, sitemap update).
