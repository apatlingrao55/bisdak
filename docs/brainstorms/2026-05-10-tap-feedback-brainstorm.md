---
date: 2026-05-10
topic: tap-feedback
---

# Site-Wide Tap & Navigation Feedback

## What We're Building

A small UX pass that makes every tappable control feel responsive on iOS (and improves it on every other platform too). Three independent layers:

1. **Global press state** — a single CSS rule that dims every `button`, `a`, and `[role="button"]` to `opacity: 0.7` on `:active` with a 100ms transition. Also sets `-webkit-tap-highlight-color: transparent` site-wide so iOS's default blue tap box doesn't double up with the custom dim.
2. **Top-of-page navigation progress bar** — a thin (2px) on-brand-green (`#36F4A4`) bar pinned to the top of the viewport that fills during Next App Router navigations and fades out on arrival. Implemented as a tiny custom client component watching `usePathname()` — no library dependency.
3. **Form submits — no change.** `app/layout.tsx:55-60` already disables submit buttons and dims them on submit; that pattern stays.

Scope: site-wide. iOS is the target device that surfaced the issue; the same fixes help Android, desktop, and accessibility on every platform.

## Why This Approach

The user reported "when I click the icons, seems nothing happens" — a combination of (a) no visual press response on tap and (b) latency between tap and the next thing rendering. Three layers separate those concerns cleanly:

- A global CSS rule (Layer 1) covers every existing inline-styled button without per-component refactoring.
- A top progress bar (Layer 2) is the universal latency indicator for App Router navigation; per-link spinners would require touching every `<Link>` and were rejected as over-scoped.
- The existing form-submit script (Layer 3) already solves the submit-pending case — leave it alone.

A scale/transform press style was considered and rejected: opacity is lighter, has no layout shift risk, and reads well on the dark theme.

NProgress (~6KB library) was considered and rejected: a 30–40 line custom component does the same job, matches the codebase's "tiny custom over deps" leaning, and lets us style with the existing brand green.

## Key Decisions

- **Press style:** `opacity: 0.7` on `:active`, 100ms transition. No scale/transform.
- **Tap highlight:** `-webkit-tap-highlight-color: transparent` applied globally so iOS's default blue box doesn't fire alongside the custom dim.
- **Selector:** `button, a, [role="button"]` (covers every interactive control in the project; nothing else uses click-like semantics today).
- **Progress bar:** custom 2px-tall fixed bar at top, color `#36F4A4`, fills 0→80% during pending and snaps to 100% on arrival before fading out. No external library.
- **Mounting:** progress bar mounts inside the root `<body>` via `app/layout.tsx`, after `<Providers>`. Single instance for the whole app.
- **Disabled state:** the press rule explicitly excludes `:disabled` to keep disabled buttons visually inert.

## Open Questions

- **Progress-bar timing:** how aggressive should the 0→80% fill be? Pick a curve in the plan (e.g., 0→30% in 100ms, 30→80% over 700ms).
- **Detecting "pending":** App Router doesn't expose a direct `isNavigating` flag. The plan should choose between (a) intercepting `<Link>` clicks via a custom hook, (b) using `useLinkStatus` if available in Next 16, or (c) heuristic — start on first user-driven nav event, end when `pathname` changes. Decide in the plan.
- **Excluded controls:** any element that should NOT dim on `:active` (e.g., disabled-looking placeholder links, decorative icons that happen to be `<a>`)? Tentatively: none, but verify during implementation.

## Next Steps

→ `/workflows:plan` for implementation details (exact CSS rule, RouteProgress component shape, pending-detection mechanism, layout integration).
