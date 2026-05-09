---
date: 2026-05-09
topic: pwa-install-button
---

# PWA with Install Button on Hero

## What We're Building

Turn BisDak into a Progressive Web App (install-only, no offline caching) and add a single "Install App" button on the hero carousel. The button detects the platform and either triggers the native install prompt (Android/Desktop Chrome) or shows a toast with manual instructions (iOS Safari, since it doesn't support `beforeinstallprompt`).

## Why This Approach

**Approaches considered:**

1. **Install-only PWA** (chosen) — Web app manifest + minimal service worker (required for installability). Single platform-aware install button. Simplest, covers the main use case.
2. **Offline-capable PWA** — Adds service worker caching of pages. More complex, unnecessary for a directory that needs fresh data.
3. **Two separate buttons (iOS/Android)** — Clutters the hero, and the logic is the same behind the scenes.

**Chosen: Install-only PWA** because it gives users the home screen icon and app-like experience with minimal code. No service worker caching complexity.

## Key Decisions

- **Manifest**: `public/manifest.json` with app name, icons (192px + 512px), theme color matching the dark theme (`#02090A`), `display: standalone`, `start_url: /`
- **Icons**: Generate from the Philippine flag emoji or a simple BisDak logo. Need 192x192 and 512x512 PNG icons in `public/icons/`
- **Service Worker**: Bare minimum — just `self.addEventListener('fetch', () => {})` to satisfy Chrome's installability requirement. No caching.
- **Install Button**: Client component `InstallButton` using the `beforeinstallprompt` event API
  - On Android/Desktop Chrome: captures the deferred prompt, button calls `prompt()` on click
  - On iOS: detects via `navigator.userAgent`, shows a toast: "Tap Share then 'Add to Home Screen'"
  - On browsers that don't support install: button is hidden
- **Placement**: Below the CTA button in `HeroCarousel`, styled as a secondary/ghost button so it doesn't compete with the main CTA
- **Meta tags**: Add `<meta name="theme-color">` and `<link rel="manifest">` to `app/layout.tsx`

## Open Questions

- **App icons**: Do you have a BisDak logo/icon, or should we generate simple ones? (Can use a placeholder for now)
- **Splash screen color**: Use `#02090A` (the dark background) for the PWA splash?

## Next Steps

-> `/workflows:plan` for implementation details
