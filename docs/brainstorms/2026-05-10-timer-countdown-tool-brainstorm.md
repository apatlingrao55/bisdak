---
date: 2026-05-10
topic: timer-countdown-tool
---

# Timer & Countdown Tool

## What We're Building

A new combined Timer + Countdown tool at `/tools/timer`. One page, one big digit display, a tab toggle to switch between two modes:

- **Stopwatch** — counts up from 0:00. Buttons: Start / Stop / Reset.
- **Countdown** — counts down to 0:00. Three numeric inputs for Hours / Minutes / Seconds plus a row of six preset buttons (1m, 5m, 10m, 25m Pomodoro, 30m, 1h). Buttons: Start / Stop / Reset.

When the countdown reaches 0:00, the page does a **visual-only alert** (no audio) — a noticeable color flash on the digit display plus a "Time's up!" message. No browser notifications, no sound (avoids iOS audio-unlock quirks and permission prompts).

The `/tools` index gets one new card ("⏱ Timer & Countdown"); Nav is untouched (only the single Tools link). `app/sitemap.ts` gains the `/tools/timer` URL.

## Why This Approach

A combined Stopwatch/Countdown tool was chosen over two separate routes (`/tools/timer` + `/tools/countdown`) because they share ~80% of their UI — the same big digit display, the same Start/Stop/Reset controls. iOS Clock and most timer apps use the tabbed-mode pattern; it reads as familiar and removes a duplicate-card from the index page.

Visual-only alert was chosen over sound or sound+visual:

- Sound on iOS Safari requires audio-context unlocking on user gesture; doable but a v1 wart.
- Most use cases (Pomodoro, prayer, parental "screen time" timer) are fine with visual.
- The kitchen-timer-across-the-room case loses, but that user can use their phone's native timer.
- Browser notifications were rejected as overkill (extra permission prompt, low user adoption).

Countdown got "presets + custom inputs" rather than presets-only or custom-only — adds six small buttons of UI but cuts the time to start a common timer from 5 taps to 2.

Stopwatch is intentionally minimal — Start/Stop/Reset, no lap times. Lap is a 90%-unused feature that adds list-management UI; deferred to v2 if requested.

## Key Decisions

- **URL:** `/tools/timer` (singular).
- **Modes:** Stopwatch and Countdown, switched via a tab control at the top of the calculator card.
- **Stopwatch:** counts MM:SS.cs (centiseconds) for precision under an hour; expands to H:MM:SS when ≥ 1 hour. Buttons: Start / Stop / Reset.
- **Countdown:** three integer inputs (H / M / S) + six preset buttons (1m, 5m, 10m, 25m, 30m, 1h). Tapping a preset fills the inputs and is one tap from Start. Buttons: Start / Stop / Reset.
- **Alert:** visual only — flash background of the digit display (e.g., toggle to a red tint for ~1.5s, then back) and replace the digits with the text "Time's up!" until Reset. No audio, no notifications.
- **Background-tab accuracy:** time is computed from `Date.now()` deltas relative to a stored "start" timestamp, NOT by counting `setInterval` ticks. Browsers throttle `setInterval` in background tabs but `Date.now()` is always correct. The interval just triggers re-renders.
- **Document title update (optional polish):** while running, set `document.title` to the live time so users can see remaining/elapsed in the tab bar. Restored on Reset.
- **Persistence on reload:** none for v1 — timers are short-lived and reload-after-Start is rare.

## Open Questions

- **Visual flash style** — solid red border vs background-color flip vs an overlay banner. Pick during planning; lowest-effort: switch the digit color to `#F87171` (existing red) for the "Time's up!" state.
- **Hour display threshold** — always show `00:00:00`, or hide hours until ≥1h, or always show MM:SS until ≥1h? Pick during planning.
- **Number input vs select for countdown presets** — leaning plain `<button>` row in `.btn-ghost` style; verify mobile layout.
- **Page Visibility API for screen-wake-lock** — would prevent the device from sleeping mid-timer. Useful for kitchen use but adds API permissions and complexity. Defer to v2.

## Next Steps

→ `/workflows:plan` for implementation details (component shape, exact display logic, tab control styling, document title behavior, sitemap update, index card entry).
