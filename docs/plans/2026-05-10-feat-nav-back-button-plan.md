---
title: Add back button to Nav on interior pages
type: feat
status: completed
date: 2026-05-10
---

# Add Back Button to Nav on Interior Pages

## Overview

Add a "Back" control to the existing fixed `components/Nav.tsx` so that on every route except home (`/`), the left slot of the nav becomes a `← Back` button instead of the BisDak logo. Behavior is hybrid: if the user has navigated within the site at least once during the session, the button calls `router.back()`; otherwise it falls back to `router.push('/')`. Right-side nav links and auth buttons are untouched. No new files; this is a single-file change with one added effect.

Brainstorm: `docs/brainstorms/2026-05-10-back-button-brainstorm.md`.

## Problem Statement / Motivation

Today, every interior page (business detail, blog post, search results, dashboard, admin, auth, legal) exposes only the brand-logo "go home" link and the global nav. There is no one-tap return to the previous page, so users who drilled into a business detail from `/search` or a blog post from `/blog` must reach for the browser back button or restart from home. This is especially painful on mobile, where the browser back button can be hidden behind a system gesture or absent entirely (PWA installs).

A back control in the nav itself — visible, predictable, mobile-friendly — closes the loop for the most common browse-then-drill-down flow.

## Proposed Solution

Modify `components/Nav.tsx`:

1. Import `useRouter` and `usePathname` from `next/navigation`.
2. On non-home routes, render `← Back` in the left slot in place of the logo `<Link href="/">`. On home, render the logo as today.
3. Track in-site navigation via a `sessionStorage` flag (`bisdak:internalNav = "1"`) that gets set by a `useEffect` watching `pathname`, gated by a `prevPathname` ref so it only fires on real navigations (and is React-strict-mode-safe).
4. Click handler: read the flag at click time. Set → `router.back()`. Unset → `router.push('/')`. Always close the mobile menu.

### Mock: `components/Nav.tsx` shape

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const INTERNAL_NAV_KEY = 'bisdak:internalNav'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated'

  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const prevPathnameRef = useRef<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname
      return
    }
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      try { sessionStorage.setItem(INTERNAL_NAV_KEY, '1') } catch {}
    }
  }, [pathname])

  const handleBack = () => {
    setMenuOpen(false)
    let hasInternal = false
    try { hasInternal = sessionStorage.getItem(INTERNAL_NAV_KEY) === '1' } catch {}
    if (hasInternal) router.back()
    else router.push('/')
  }

  return (
    <nav style={{ /* unchanged */ }}>
      {isHome ? (
        <Link href="/" style={{ /* existing logo styles */ }}>
          🇵🇭 BisDak <span className="hidden sm:inline" style={{ fontWeight: 400, color: '#A1A1AA' }}>— Pinoy Business Hub NZ</span>
        </Link>
      ) : (
        <button
          onClick={handleBack}
          aria-label="Go back"
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '15px',
            letterSpacing: '0.1px',
            cursor: 'pointer',
            padding: '4px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1 }}>←</span>
          Back
        </button>
      )}

      {/* Desktop nav and mobile toggle/overlay unchanged */}
    </nav>
  )
}
```

## Technical Considerations

### Why `sessionStorage` over `window.history.length`

`window.history.length` includes the forward stack, varies between browsers (Chrome can seed it at `2`), and gives false positives on pages opened in a new tab. The `sessionStorage` flag, set only after the *first* observed pathname change, gives a clean "the user has navigated within this tab/session" signal that survives reloads of the same tab and resets when a new tab is opened.

### Strict-mode safety

React 18 dev mode re-runs `useEffect` to test cleanup idempotency. Naive "first render guard" patterns (`firstRenderRef.current = false` on first run) falsely fire on the strict-mode re-run, setting the flag immediately on initial load. Using a `prevPathnameRef` that compares the actual pathname is idempotent: re-running the effect with the same `pathname` is a no-op.

### SSR and hydration

`Nav.tsx` is already `'use client'`. `useRouter` and `usePathname` are client-only and safe. `sessionStorage` access is wrapped in `try/catch` and only happens inside effects/handlers (never during render), so there is no SSR-time access and no hydration mismatch — the initial HTML always renders the back button identically on server and client (no flicker between logo/back; the `pathname === '/'` check is evaluated server-side too).

### Mobile menu interaction

The back button closes the mobile menu on click (matching the existing pattern where every mobile menu link calls `setMenuOpen(false)`). The back button is only rendered in the fixed top bar, not inside the mobile overlay — the overlay already has the `✕` toggle for closing.

### Styling

Match the existing nav typography (white text, weight 600 to read like a control rather than body copy, `15px` matching desktop nav links). No Tailwind classes added — the project's dominant pattern in this file is inline `style` + a few utility classes from `globals.css`. The character `←` is used (not an SVG icon) to keep the change tiny and match the existing `app/blog/[slug]/page.tsx:86-88` precedent.

## System-Wide Impact

- **Interaction graph**: `pathname` change → Nav `useEffect` writes `sessionStorage` flag. Click on Back → handler reads flag, calls `router.back()` (browser-history-driven) or `router.push('/')` (client navigation, prefetched by Next App Router). No server calls, no auth checks, no callbacks beyond standard Next routing.
- **Error propagation**: `sessionStorage` access wrapped in `try/catch` (Safari private mode + cookie-blocked contexts can throw on quota / access). Failure mode: flag never sets → button always falls back to `/`. Acceptable degradation.
- **State lifecycle risks**: None. `sessionStorage` is per-tab and cleared on tab close. No DB or server state touched.
- **API surface parity**: Only one place exposes nav controls (`Nav.tsx`). No duplicate or parallel surface needs the same change.
- **Existing duplicate UI**: `app/blog/[slug]/page.tsx:86-88` renders its own `← Back to News` (fixed → `/blog`). It has different semantics (always go to news, not "wherever you came from"), so it can stay. Optional cleanup deferred.
- **Auth flow**: NextAuth uses `callbackUrl` (e.g., `/auth/sign-in?callbackUrl=/business/<slug>` in `app/business/[slug]/page.tsx:290`) and `app/auth/sign-in/actions.ts` hardcodes `redirectTo: '/dashboard'`. Browser back from `/dashboard` will still go to `/auth/sign-in` — same as today; not regressed.

### Integration scenarios (manual verification)

1. **In-site browse → back**: Open `/` → click "Browse" → land on `/search` → click a business card → land on `/business/<slug>` → click `← Back` → expect `/search`. Click `← Back` again → expect `/`.
2. **Direct landing → back**: Open `/business/<slug>` directly (incognito or new tab from external link) → click `← Back` → expect `/` (fallback, since no in-tab history).
3. **Reload preserves history awareness**: From scenario 1, on `/business/<slug>`, hard-reload the page → click `← Back` → expect to still go back to `/search` (sessionStorage persisted).
4. **Mobile menu interaction**: On `/search`, open hamburger → click `← Back` (visible above overlay in fixed bar) → expect menu closes and navigation occurs.
5. **Auth flow**: From `/business/<slug>` click "Claim this business" → `/auth/sign-in?callbackUrl=...` → click `← Back` → expect `/business/<slug>` (browser history).
6. **Home page**: On `/`, expect logo (not back button).

## Acceptance Criteria

- [x] On every route where `pathname !== '/'`, the left side of the fixed Nav shows `← Back` instead of the BisDak logo.
- [x] On `/`, the existing logo link continues to render as today (no visual regression).
- [x] Clicking `← Back`:
  - [x] When the user has navigated at least once within the tab, calls `router.back()`.
  - [x] When this is the first/only entry in the tab's history, calls `router.push('/')`.
- [x] The back button has `aria-label="Go back"` and the `←` glyph is `aria-hidden`.
- [x] Clicking the back button closes the mobile menu (`menuOpen → false`) before navigating.
- [x] `sessionStorage` access is wrapped in `try/catch`; the page does not error in private/quota-blocked contexts.
- [x] Nav remains 64px tall and right-side links/buttons (`Browse`, `News`, `Submit a Business`, auth buttons, hamburger) are visually and behaviorally unchanged.
- [ ] No hydration warnings in the browser console on home or interior pages. *(verify in browser)*
- [x] `tsc --noEmit` passes; `next build` succeeds. *(tsc passed; build not run — change is localized)*

## Success Metrics

- Manual smoke test: scenarios 1–6 above all pass.
- No new console errors in dev or production builds.
- Visual: back control fits in the 64px bar at 320px, 768px, and 1280px widths without overlapping the hamburger or right-side nav.

## Dependencies & Risks

- **Risk: false positive history detection in dev** — strict-mode-safe `prevPathnameRef` pattern mitigates. Verified by manually navigating in dev.
- **Risk: `sessionStorage` blocked** — wrapped in `try/catch`. Degrades to always-fallback-to-`/`. Acceptable.
- **Risk: visual mismatch with existing nav typography** — match `15px` / weight 600 / white. Verify against `Nav.tsx:46-54` desktop links.
- **Risk: scope creep** — explicitly NOT touching `app/blog/[slug]/page.tsx:86-88`'s `← Back to News` link, NOT adding back to mobile overlay, NOT adding per-route fallback parents. All deferred.
- **No external dependencies.** No new packages.

## Out of Scope

- Replacing or removing the existing `← Back to News` link in `app/blog/[slug]/page.tsx`.
- Per-route smart fallbacks (e.g., business → search). Brainstorm decided always-`/`.
- Adding the back button anywhere outside `components/Nav.tsx`.
- Animations or transitions on the button.
- Keyboard shortcut (e.g., `Esc` triggers back).

## References & Research

### Internal

- Brainstorm: `docs/brainstorms/2026-05-10-back-button-brainstorm.md`
- Component to modify: `components/Nav.tsx` (entire file, primarily `Nav.tsx:1-42` for imports/logo replacement and one new effect)
- Pages confirmed to render `<Nav />`: all 18 pages in `app/**` (no page omits Nav; conditional must live inside Nav)
- Style references: `Nav.tsx:46-54` (desktop link styling to match), `Nav.tsx:34-42` (logo to replace conditionally)
- Existing precedent: `app/blog/[slug]/page.tsx:86-88` (`← Back to News`)
- Existing `useRouter` usage in repo: `components/SearchBar.tsx:2,6,11`
- Auth integration points (verified non-conflicting): `app/business/[slug]/page.tsx:290`, `app/auth/sign-in/actions.ts`
- Utility classes available: `globals.css` `.btn-primary`, `.btn-ghost`, `.nav-desktop`, `.nav-mobile-toggle`, `.nav-mobile-overlay`
- TypeScript: `tsconfig.json` strict mode, path alias `@/*`

### Next.js docs (read from node_modules per AGENTS.md)

- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` — `router.back()` navigates to previous browser-history entry; `useRouter` from `next/navigation`.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md` — `usePathname` is a Client Component hook returning the current pathname string.

### Project guidance

- `AGENTS.md`: "This is NOT the Next.js you know" — verified Next API surface against `node_modules/next/dist/docs/`. No deprecated APIs used.
