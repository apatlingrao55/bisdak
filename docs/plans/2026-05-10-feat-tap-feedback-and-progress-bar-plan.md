---
title: Site-wide tap feedback and navigation progress bar
type: feat
status: completed
date: 2026-05-10
---

# Site-Wide Tap Feedback and Navigation Progress Bar

## Overview

Three independent layers of feedback that make the site feel responsive on iOS (and improve every other platform too):

1. **Layer 1 — Global press states.** A single CSS rule in `app/globals.css` that dims any `<button>`, `<a>`, or `[role="button"]` to `opacity: 0.7` on `:active`, plus `-webkit-tap-highlight-color: transparent` site-wide.
2. **Layer 2 — Top-of-page navigation progress bar.** A new `components/RouteProgress.tsx` client component (~80 lines, no library) renders a 2px-tall fixed bar in the on-brand green `#36F4A4`. It listens for clicks on internal anchors plus a custom `bisdak:nav-start` event for programmatic navigations, and finalizes when `usePathname` / `useSearchParams` change.
3. **Layer 3 — Form submits.** Already handled by the inline script at `app/layout.tsx:55-60`. No change.

Brainstorm: `docs/brainstorms/2026-05-10-tap-feedback-brainstorm.md`.

## Problem Statement / Motivation

User feedback: "When I click the icons, seems nothing happens." Two distinct issues are bundled together:

- **No press response.** Inline-styled buttons across the site have no `:active`, `:hover`, or tap-highlight treatment. iOS's default blue tap highlight is fine but inconsistent and not on-brand. The user's finger lands on a button and visually nothing changes.
- **Navigation latency feels like a no-op.** Some App Router pages (especially `/business/[slug]` with its OG image generation, `/search` filtering) take a beat. With nothing on screen indicating "we heard you," users tap again or assume the click failed.

Per AGENTS.md, the project uses Next 16 — research confirms App Router has no global `isNavigating` hook. The fix is to instrument navigation ourselves with a tiny custom indicator.

## Proposed Solution

### Layer 1 — `app/globals.css`

Add at the top of `globals.css` (above existing utility classes):

```css
/* Tap feedback — universal press dim, suppress iOS default blue highlight */
button,
a,
[role="button"] {
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-reduced-motion: no-preference) {
  button,
  a,
  [role="button"] {
    transition: opacity 100ms ease;
  }
}

button:active:not(:disabled),
a:active,
[role="button"]:active:not([aria-disabled="true"]) {
  opacity: 0.7;
}
```

- `:not(:disabled)` keeps disabled buttons inert (e.g., the form-submit script's `b.disabled=true`).
- `:not([aria-disabled="true"])` covers ARIA-disabled anchors/role-button divs.
- `prefers-reduced-motion` gate on the transition keeps the rule itself active (still dims on press) but disables the smooth fade for users who prefer reduced motion.
- 5 components with inline `opacity` (see "Out of scope") are de facto exempt; their stateful inline value wins over our class rule. Acceptable — they already convey state.

### Layer 2 — `components/RouteProgress.tsx` (new)

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const NAV_START_EVENT = 'bisdak:nav-start'
const COLOR = '#36F4A4'

type Phase = 'idle' | 'running' | 'finishing'

export default function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [width, setWidth] = useState(0)
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const phaseRef = useRef<Phase>('idle')

  // Keep phaseRef in sync so listeners read fresh state without re-binding
  useEffect(() => { phaseRef.current = phase }, [phase])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const start = () => {
    if (phaseRef.current !== 'idle') return  // already running, don't re-trigger
    clearTimers()
    setPhase('running')
    setWidth(0)
    // Two-phase fill: 0→30% snappy, 30→80% steady. CSS transitions do the easing.
    timersRef.current.push(setTimeout(() => setWidth(30), 16))   // next frame
    timersRef.current.push(setTimeout(() => setWidth(80), 120))  // after the 100ms snap
  }

  const finish = () => {
    if (phaseRef.current === 'idle') return
    clearTimers()
    setPhase('finishing')
    setWidth(100)
    timersRef.current.push(setTimeout(() => {
      setPhase('idle')
      setWidth(0)
    }, 280))  // 80ms snap to 100 + 200ms fade
  }

  // Custom event for programmatic navigation
  useEffect(() => {
    const onStart = () => start()
    window.addEventListener(NAV_START_EVENT, onStart)
    return () => window.removeEventListener(NAV_START_EVENT, onStart)
  }, [])

  // Document-level click listener for <Link>/<a> taps
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return
      const a = (e.target as HTMLElement | null)?.closest?.('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href) return
      if (href.startsWith('#')) return                              // in-page anchor
      if (a.target && a.target !== '_self') return                  // new tab
      // External absolute URL?
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return
      // Same path? avoid pointless bar
      if (href === pathname) return
      start()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  // End trigger: arrived at new route
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()])

  const visible = phase !== 'idle'
  const transitionMs =
    phase === 'finishing' ? 80 :
    width === 30 ? 100 :
    width === 80 ? 700 :
    0

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 200,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: `opacity 200ms ease ${phase === 'finishing' ? '80ms' : '0ms'}`,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: COLOR,
          boxShadow: `0 0 8px ${COLOR}`,
          transition: `width ${transitionMs}ms ease-out`,
        }}
      />
    </div>
  )
}
```

### Layer 2 wiring — `app/layout.tsx`

Render `<RouteProgress />` inside `<body>` so it overlays everything. `useSearchParams` requires a Suspense boundary — wrap accordingly.

```tsx
// near other imports
import { Suspense } from 'react'
import RouteProgress from '@/components/RouteProgress'

// inside <body>
<Suspense fallback={null}>
  <RouteProgress />
</Suspense>
<Providers>{children}</Providers>
```

### Layer 2 wiring — programmatic navigation call sites

Add a one-liner before each programmatic `router.push/back/replace`:

- **`components/SearchBar.tsx:11`** — before `router.push('/search?q=...')`:
  ```ts
  window.dispatchEvent(new Event('bisdak:nav-start'))
  router.push(...)
  ```

- **`components/Nav.tsx:45-46`** — inside `handleBack`, before `router.back()` and `router.push('/')`:
  ```ts
  window.dispatchEvent(new Event('bisdak:nav-start'))
  if (hasInternal) router.back()
  else router.push('/')
  ```

That's the entire diff for Layer 2 wiring.

## Resolved Open Questions

### Q1. Progress-bar fill curve

**Decision:** Two-phase, CSS-transition-driven.

- **Snap (0 → 30%)** in 100ms — confirms the click was heard.
- **Steady (30 → 80%)** in 700ms — communicates "we're working."
- **Done (80 → 100%)** in 80ms on `pathname` change, then 200ms opacity fade.

CSS handles the easing; JavaScript only sets target widths. No `requestAnimationFrame` loop, no interval timer.

### Q2. Pending-detection mechanism

**Decision:** Hybrid: document-level click listener for `<a>`/`<Link>` taps, custom `bisdak:nav-start` DOM event for programmatic navigations.

**Rejected alternatives:**

- **`useLinkStatus`** (Next 15.3+, confirmed shipped in 16.2.6 at `node_modules/next/dist/client/link.d.ts:117-119`) — per-Link only and forces a descendant element pattern. Wrong tool for a global indicator.
- **`loading.tsx`** — Suspense-based per-segment loading UI; not global; project has none today.
- **Monkeypatch `history.pushState`** — fragile, conflicts with Next's internal use.

### Q3. Opt-outs

**Decision:** Built-in `:not(:disabled)` / `:not([aria-disabled="true"])`. The 5 stateful inline-`opacity` sites are de facto exempt without changes. Do **not** use `!important` to force-override inline styles — would create visual jitter (`0.5 → 0.7 → 0.5` on press on already-dimmed buttons).

## Technical Considerations

- **No new dependencies.** Custom progress component avoids the ~6KB NProgress + adapter combo.
- **Cascade & specificity.** Existing `.btn-primary:hover { opacity: 0.88 }` (`globals.css:77`) and `.btn-ghost:hover` rules are class-level and unaffected. Our `button:active` rule is also class-level (well, element-level) and composes via the cascade — the more recently parsed `:active` wins over `:hover` when both are active simultaneously.
- **Existing form-submit script** (`app/layout.tsx:55-60`) sets `b.disabled=true` and inline `opacity: 0.5`. Our `:not(:disabled)` selector skips disabled buttons, so the inline 0.5 stays put — no flicker on submit.
- **`useSearchParams` Suspense requirement.** Per Next 16 docs, `useSearchParams` requires a Suspense boundary. RouteProgress will be wrapped in `<Suspense fallback={null}>` in layout.tsx.
- **Reduced motion.** Press transition is gated on `prefers-reduced-motion: no-preference`. The progress bar still renders for those users — width snap is instant — so they get the indicator without the fade.
- **Click listener performance.** Single document-level capture listener; `closest('a')` is fast. Negligible cost.
- **Hydration.** RouteProgress is `'use client'` and renders a hidden bar (opacity 0, width 0) in initial HTML — no hydration mismatch.

## System-Wide Impact

- **Interaction graph:**
  - Tap on `<Link>` → click bubbles → captured by RouteProgress listener → `start()` → React state → CSS transitions → `pathname` changes after navigation → `finish()` → fade out.
  - Tap on a programmatic-nav button (search submit, back button) → component dispatches `bisdak:nav-start` → window event listener in RouteProgress → `start()` → … same downstream as above.
  - Press on any button/link → CSS `:active` pseudo-class engages → `opacity: 0.7` for the duration of the press. No JS involved.
- **Error propagation:** None. Failed navigations leave the bar at 80% until the next `pathname` change, which is rare; on a navigation error Next will either render an error boundary (still a route change → finishes) or stay on the same page (bar stuck at 80%). Add a 10-second safety timeout in `start()` that auto-finishes if no pathname change arrives.
- **State lifecycle risks:** Timers cleared on every state transition via `clearTimers()`. On unmount, the cleanup effect would also clear them — though RouteProgress lives at the root and never unmounts in normal navigation.
- **API surface parity:** None. There is one progress bar instance for the whole app. No alternate interfaces.

### Manual verification scenarios

1. **Tap dim — Nav back button.** On `/search`, press the `← Back` button on a phone (or simulate touch in DevTools). Button visibly dims to ~70% opacity while pressed; returns to full on release. No iOS blue highlight.
2. **Tap dim — `.btn-primary`.** Click "Sign In" on `/auth/sign-in`. Hover state (0.88 opacity) + active state (0.7 opacity) compose correctly — pressing while hovering goes to 0.7.
3. **Tap dim — disabled button.** Submit a form. After submit, the disabled button stays at the inline `opacity: 0.5` set by the script — no extra dim on press.
4. **Progress bar — Link click.** From `/`, click "Browse" → green bar fills 0→30% snap, then steady to 80%. On `/search` arrival, snaps to 100%, fades.
5. **Progress bar — programmatic nav.** From `/search`, type a query and submit (SearchBar uses `router.push`) → bar appears thanks to the dispatched event. Same for the Nav back button.
6. **Progress bar — same-page anchor.** Click an `href="#section"` link → bar does NOT trigger.
7. **Progress bar — external link.** Click an `https://other-site.com` link → bar does NOT trigger.
8. **Progress bar — Cmd+click new tab.** Cmd-click a Link → no bar (modifier-key filter).
9. **Reduced motion.** Set OS reduced-motion preference → press dim is instant (no fade transition); bar still appears but width changes are also instant if you want to extend the rule. Acceptable either way.
10. **No hydration warnings** in the browser console on home or any interior page.

## Acceptance Criteria

### Layer 1 — Press states

- [x] `button:active:not(:disabled)`, `a:active`, and `[role="button"]:active:not([aria-disabled="true"])` resolve to `opacity: 0.7` on every page.
- [x] `-webkit-tap-highlight-color: transparent` applied to all `button`, `a`, `[role="button"]`.
- [x] Press dim transition is gated on `prefers-reduced-motion: no-preference`.
- [x] Disabled buttons (incl. those disabled by `app/layout.tsx:55-60`) do **not** dim further on press.
- [x] Existing `.btn-primary:hover { opacity: 0.88 }` and `.btn-ghost:hover` continue to work; pressing an already-hovered button goes to 0.7 then back.

### Layer 2 — Progress bar

- [x] A 2px green (`#36F4A4`) bar appears at the very top of the viewport during navigation.
- [x] Bar fills 0→30% in ~100ms, 30→80% in ~700ms, snaps to 100% on `pathname` change, fades over 200ms.
- [x] Bar triggers on:
  - [x] Same-origin `<Link>` clicks (no modifier keys, primary button, not `target=_blank`).
  - [x] `bisdak:nav-start` custom events dispatched by `SearchBar.tsx` and `Nav.tsx` `handleBack`.
- [x] Bar does NOT trigger on:
  - [x] In-page anchor clicks (`href="#..."`).
  - [x] External absolute URLs.
  - [x] Same-path clicks.
  - [x] Modifier-key clicks (Cmd/Ctrl/Shift/Alt) or non-primary mouse buttons.
- [x] If no `pathname` change arrives within 10s, bar auto-finishes (safety timeout).
- [x] Bar is `pointer-events: none` and `aria-hidden="true"`.

### Quality gates

- [x] `npx tsc --noEmit` passes.
- [ ] No new console errors or hydration warnings on `/`, `/search`, `/business/<slug>`, `/blog`, `/blog/<slug>`, `/auth/sign-in`. *(verify in browser)*
- [ ] All scenarios in "Manual verification scenarios" pass. *(verify in browser)*

## Success Metrics

- Subjective: tapping any button on bisdak.co.nz on iOS Safari produces an immediate visible response (dim) and a visible top-of-page indicator during navigation.
- Objective: no regression in navigation timing (the bar is purely additive UI; no extra round-trips).

## Dependencies & Risks

- **No new dependencies.**
- **Risk: stateful inline-opacity components don't dim on tap.** Mitigation: explicit list in "Out of scope"; revisit if user reports it.
- **Risk: bar gets stuck if a navigation never resolves.** Mitigation: 10-second safety timeout in `start()` that calls `finish()`.
- **Risk: `:active` doesn't fire on iOS for some elements.** Historically iOS Safari doesn't fire `:active` on `<div>` without `cursor: pointer` or a touch handler. Our selector is `button, a, [role="button"]` — all of which do fire `:active`. No risk for in-scope elements.
- **Risk: existing `signOut({ callbackUrl: '/' })` calls** (`Nav.tsx:115,170`) bypass the router — full page navigations. They won't trigger the bar via the click listener (the click is on the sign-out button, not a Link). Acceptable — sign-out is fast and the page reload is its own visible indicator.

## Out of Scope

The following components have stateful inline `opacity` and will NOT dim on press as a result. Documented intentional exemption:

- `app/auth/verify/VerifyForm.tsx:146` — resend button, `opacity: resending ? 0.5 : 1`.
- `app/business/[slug]/page.tsx:138` — decorative `opacity: 0.3`.
- `app/business/[slug]/page.tsx:285` — review form gate, `opacity: canReview ? 1 : 0.5`.
- `components/ClaimButton.tsx:116` — verifying state, `opacity: state === 'verifying' ? 0.6 : 1`.
- `components/ClaimButton.tsx:138` — sending-otp state, `opacity: state === 'sending-otp' ? 0.6 : 1`.

Also out of scope:

- Per-Link `useLinkStatus` spinners.
- `loading.tsx` segment-loading files.
- Per-button hover indicators on desktop (only `:active` for press).
- Audio / haptic feedback (iOS Safari blocks Vibration API; brainstorm rejected).

## References & Research

### Internal

- Brainstorm: `docs/brainstorms/2026-05-10-tap-feedback-brainstorm.md`
- `app/globals.css` (full file, 161 lines) — utility classes, no current `:active`/`-webkit-tap-highlight-color` rules
- `app/layout.tsx:55-60` — existing form-submit pending script (do not break)
- `components/Nav.tsx:39-47` — `handleBack` (add event dispatch)
- `components/SearchBar.tsx:11` — `router.push` call site (add event dispatch)
- Inline-opacity exemptions: `app/auth/verify/VerifyForm.tsx:146`, `app/business/[slug]/page.tsx:138,285`, `components/ClaimButton.tsx:116,138`

### Next 16 docs (read from node_modules per AGENTS.md)

- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` — `router.push/back/replace/refresh/prefetch`; canonical "navigation completed" pattern at lines 71-115 uses `usePathname` + `useSearchParams` + `useEffect`. No global `pending` exposed by `useRouter`.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md` — `useLinkStatus()` returns `{ pending: boolean }`, must be a Link descendant; "prefer a fixed-size, always-rendered hint element" warning. Per-Link, not global.
- `node_modules/next/dist/client/link.d.ts:117-119` — `useLinkStatus` type signature confirmed in 16.2.6.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md` — client-only, returns string.

### Project guidance

- `AGENTS.md` — "This is NOT the Next.js you know"; verified Next 16 navigation API surface against `node_modules/next/dist/docs/`.
