---
date: 2026-05-11
topic: autoblog-port
---

# Port InspectPro's Autoblog to BisDak

## What We're Building

A Python-based content pipeline, ported from `inspectpro-v2-web/autoblog`, that
discovers topics, drafts and reviews posts with Claude, and inserts them as
**drafts** into BisDak's Postgres `posts` table for human approval. Content
focus: Filipino-NZ community news + NZ jobs/visa/employment topics. Runs on the
same VPS as the InspectPro autoblog, second install at `/opt/bisdak-autoblog`,
driven by cron. Pipeline shape (discover → write → review → publish → notify)
is reused; publisher and content strategy are rewritten.

## Why This Approach

Considered three publish targets:
- **MDX-to-git** (one-to-one with InspectPro): rejected — would force a blog
  rewrite on BisDak, which currently reads `posts` from Postgres.
- **TypeScript in-repo via Vercel Cron**: rejected for now — cleaner long-term
  but discards the Python work already tuned for InspectPro.
- **Python + direct Postgres insert** (chosen): minimal change to BisDak, full
  reuse of the existing pipeline, only the publisher and prompts/sources need
  to change.

## Key Decisions

- **Publisher**: Replace `publisher.py` git+MDX logic with a direct Postgres
  `INSERT` into `posts` using `psycopg`. Connection string lives in `.env`
  alongside other secrets.
  **Why**: BisDak stores posts in the DB; no MDX/filesystem layer to honour.
- **Publish status**: All autoblog posts land as `status='draft'`. Human flips
  to `published` via `/admin`.
  **Why**: Cold-start safety. InspectPro's pipeline has months of tuning;
  BisDak's prompts/sources will be brand-new. Switch to direct-publish later
  once trusted.
- **Content domain**: Filipino-NZ community news + jobs/visa/employment
  (option (d) from brainstorm). Discovery sources, keyword list, and the four
  prompts (`topic_ideas.txt`, `research.txt`, `writer.txt`, `reviewer.txt`)
  all get rewritten for this domain.
  **Why**: InspectPro's home-inspection sources are useless here; BisDak's two
  primary user draws (community, jobs) give enough topical surface to sustain
  volume.
- **Repo layout**: Copy the `autoblog/` folder into `bisdak/` as a top-level
  directory, mirroring InspectPro.
  **Why**: Versioned next to the site it publishes to; same operator pattern
  user already knows.
- **VPS placement**: Same VPS as InspectPro autoblog, second install at
  `/opt/bisdak-autoblog` with its own venv, `.env`, cron entries, and
  `/var/log/bisdak-autoblog/`.
  **Why**: One box to maintain; isolation comes from separate paths and lock
  files (`/tmp/bisdak_autoblog_*.lock`).
- **Metadata dropped on the floor**: `keywords`, `related_pages`, `citations`,
  `category` — none exist on `posts`. Template is replaced with plain
  markdown body that targets BisDak's existing renderer in
  `app/blog/[slug]/page.tsx`. If citations matter, append a "Sources" section
  into `content` later.
  **Why**: BisDak's blog renderer is not MDX. Avoid schema churn until a
  concrete need appears.
- **Author byline**: Schema default `'BisDak Team'`. No change.
- **Notifications**: Reuse Resend; same `NOTIFY_EMAIL` recipient as InspectPro.
- **Cadence**: Match InspectPro defaults — discover daily 02:00, publish
  Mon–Fri 03:00, keywords Sun 02:00, health Mon 09:00.

## Open Questions

- Discovery sources for the BisDak domain — which RSS feeds and pages?
  Candidate list to validate during planning: RNZ Pacific, Stuff "Pasifika"
  section, Immigration NZ news, beehive.govt.nz visa announcements, MBIE jobs
  data, Filipino-NZ community Facebook pages (require login — likely skip),
  embassy announcements.
- Slug/title collision policy — `posts.slug` is unique. Should the writer
  retry with a suffix, or refuse and surface a notifier alert? (InspectPro
  uses filesystem; BisDak gets a hard DB constraint.)
- Content sanitisation — BisDak's renderer only handles a small markdown
  subset (`**bold**`, `*italic*`, `[link](url)`, `---`, `**Headers**`). The
  writer prompt must be constrained to that subset, or the renderer needs
  upgrading. Pick during planning.
- DB credential scope — create a dedicated Postgres role limited to
  `INSERT/UPDATE` on `posts` only? (Defence in depth vs. just using the
  existing service-role URL.)

## Next Steps

→ `/workflows:plan` to turn this into concrete implementation steps:
file-level changes (which Python modules to copy as-is, which to rewrite),
prompt rewrites, schema-renderer reconciliation, VPS setup script diffs, and
the publisher's Postgres logic.
