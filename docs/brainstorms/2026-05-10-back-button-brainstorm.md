---
date: 2026-05-10
topic: back-button
---

# Back Button on Interior Pages

## What We're Building

A "Back" control on every interior page (everything except the home route `/`) so users browsing the site can return to where they came from in one tap. The control lives inside the existing fixed `Nav` bar — on non-home routes, the left slot becomes `← Back` instead of (or alongside) the logo. Right-side nav links and auth buttons remain unchanged.

Behavior is hybrid: if there is in-site navigation history, the button calls `router.back()`. Otherwise (e.g., the user landed directly from a shared link), it falls back to home `/`.

## Why This Approach

Three placements were considered: inside the existing `Nav` (chosen), a standalone control below the nav inside each page, and a floating sticky button. The Nav is already fixed and present on every interior page, so reusing its left slot adds zero vertical layout churn, gives one consistent control surface, and matches polished app patterns (Instagram, Airbnb).

Hybrid back behavior was preferred over pure `router.back()` (can strand users who landed via shared link) and pure hierarchical "up" (ignores actual navigation history and feels rigid). The simple home fallback was chosen over per-route parent mappings — predictable, dead simple, and almost never the wrong answer for this site's shape.

## Key Decisions

- **Scope:** all routes except `/`. Includes `/business/[slug]`, `/blog`, `/blog/[slug]`, `/search`, `/submit`, `/dashboard`, `/dashboard/edit/[slug]`, `/admin`, `/auth/*`, and legal pages (`/privacy`, `/terms`, `/cookies`, `/disclaimer`).
- **Placement:** inside the existing `components/Nav.tsx`, on the left where the logo currently sits. Replaces or precedes the logo on non-home routes. Right-side links/buttons unchanged.
- **Behavior:** hybrid — `router.back()` when there is in-site history, else navigate to `/`.
- **Fallback target:** always `/` (no per-route parent mapping).
- **Visual style:** matches the existing nav — same height (64px), same color treatment (transparent → `#102620` on scroll), same typography weight as the current logo link. Detailed styling deferred to the planning phase.

## Open Questions

- **History detection mechanism:** how do we reliably know there's in-site history? Options include checking `window.history.length`, tracking visited routes in a small client-side store, or a referrer check. To be decided in the plan.
- **Logo treatment on interior pages:** is the logo fully replaced by `← Back`, or shown alongside it (back button + compact logo)? Pick during plan/design pass.
- **Mobile breakpoint:** confirm the back button fits cleanly with the hamburger toggle on the right at small widths.

## Next Steps

→ `/workflows:plan` for implementation details (history-detection mechanism, exact JSX changes in `components/Nav.tsx`, conditional rendering via `usePathname`, styling, mobile spacing).
