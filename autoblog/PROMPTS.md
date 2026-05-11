# Autoblog Prompt Changelog

Prompts live in `autoblog/autoblog/prompts/`. Iterating on them changes
content quality in production — record what you changed and why.

## 2026-05-11 — Initial bisdak port

Forked from InspectPro autoblog. All four prompts rewritten from scratch
for BisDak's content domain.

- `topic_ideas.txt` — discovery brainstorm. Audience is two-sided
  (Filipinos in NZ vs intending migrants). Refusal categories enumerated.
- `research.txt` — produces a structured brief. Adds a `"refusal"`
  short-circuit so the LLM can decline a topic at brief stage rather
  than draft something it shouldn't.
- `writer.txt` — the operative prompt. Locked to BisDak's renderer
  subset (whole-line `**heading**`, `- item` lists, `> quote`, inline
  `**bold**` / `*italic*` / `[link](https://…)`, no `##` headings, no
  code fences, no images). Authoritative-citation requirement.
- `reviewer.txt` — Opus pass. Verifies markdown subset compliance,
  citation gate, refusal categories, and surfaces risk flags
  (`mentions_immigration`, `mentions_political`, …).

## How to iterate

1. Edit the prompt in place.
2. Trigger a single publish cycle:
   ```bash
   /opt/bisdak-autoblog/run.sh publish
   ```
3. Read the resulting draft on `/admin/posts/<id>`.
4. If it's worse than before, `git diff` and reason about what you
   changed.
5. Append a dated entry below.

## Template entry

```
## YYYY-MM-DD — short summary

- Changed: prompt file(s) edited
- Why: observed behaviour that needed fixing
- Effect: what you expect to change
- Notes: any caveats / rollback notes
```
