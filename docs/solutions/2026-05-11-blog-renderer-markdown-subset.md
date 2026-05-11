---
title: BisDak blog renderer markdown subset
date: 2026-05-11
tags: [blog, renderer, markdown, content, xss]
related: [lib/blog-renderer.tsx, autoblog/writer.txt]
---

# BisDak blog renderer markdown subset

## Problem

`lib/blog-renderer.tsx` is a hand-rolled markdown subset, not a full
parser (no `react-markdown`, no `remark`, no `rehype`). Anything outside
the supported subset renders as raw text or silently disappears. The
autoblog and any other content generator must constrain themselves to
exactly this surface, or posts arrive broken.

## Supported syntax

**Block-level:**

- `**Whole line**` (line starts AND ends with `**`) → `<h3>` section heading
- `- item` → `<li>`. Consecutive `- ` lines group into one `<ul>`
- `> quote` → `<blockquote>` with left-border accent
- `---` (line starts with three dashes) → `<hr>` divider
- Empty line → 12px spacer div

**Inline (inside paragraph, list item, or blockquote):**

- `**bold text**` → `<strong>`
- `*italic text*` → `<em>`
- `[label](https://…)` → `<a>`. **Only http/https URLs are allowed.**
  Non-matching schemes (mailto:, tel:, javascript:, relative paths)
  render as bare label text.

## NOT supported (will surface as raw text or vanish)

- `##` / `###` headings — use the `**Whole Line**` form instead
- Numbered lists `1.`, `2.`
- Code fences ``` ``` ``` or inline backtick `code`
- Tables, footnotes, definition lists, task lists
- Raw HTML tags, `<details>`, `<br>`
- Images
- Relative-path links (e.g. `[About](/about)`) — renderer rejects non-http(s)
- `mailto:` / `tel:` — same reason

## XSS posture

Every line that uses `dangerouslySetInnerHTML` runs through
`escapeHtml()` *first*, then markdown substitution:

```
raw line
  → escapeHtml (& < > " escaped)
  → [text](url) replacement (http/https only; everything else is bare text)
  → **bold** replacement
  → *italic* replacement
  → injected as innerHTML
```

The heading branch (`**Whole Line**` → h3) is `<h3>{line.slice(2,-2)}</h3>`
— React auto-escapes the child text, so no `dangerouslySetInnerHTML`
exposure.

## Why this matters

The autoblog writer prompt is **locked to this subset** in
`autoblog/autoblog/prompts/writer.txt` and the reviewer prompt
**verifies subset compliance** in `autoblog/autoblog/prompts/reviewer.txt`.
Drift here = silently broken posts.

If you upgrade the renderer (e.g. add code blocks, h2/h3 syntax, lists
with `*`), update both prompts the same day.

## Future upgrade path (not in scope)

If reader feedback or content needs justify a bigger leap:

1. Replace with `react-markdown` + `rehype-sanitize` with a tight
   allowlist (`h2, h3, p, strong, em, a, ul, ol, li, blockquote, hr`)
2. Run a regression check against the seeded posts in
   `lib/db/seed-posts.ts` before switching

Stay with the hand-rolled renderer as long as the subset is enough —
it's 80 lines, dependency-free, and visually consistent.

## Related

- `lib/blog-renderer.tsx` — the renderer itself
- `app/blog/[slug]/page.tsx` — public usage
- `app/admin/posts/[id]/page.tsx` — admin preview uses the same renderer (parity)
- `autoblog/autoblog/prompts/writer.txt` — enforces this subset on generated drafts
- `autoblog/autoblog/prompts/reviewer.txt` — verifies subset compliance during Opus review
