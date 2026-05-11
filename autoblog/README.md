# bisdak-autoblog

Python content pipeline that drafts blog posts for BisDak via Claude
(Sonnet draft + Opus review), then inserts them as **drafts** into the
bisdak Postgres `posts` table. A human approves drafts via the admin
review page (`/admin/posts/<id>`) before they go live.

This is a port of the InspectPro autoblog. Pipeline shape is reused;
publisher, prompts, sources, and safety rails are rewritten for BisDak's
content domain (Filipino-NZ community + NZ jobs/visa).

## Architecture

```
┌──────────── VPS (/opt/bisdak-autoblog) ───────────┐
│                                                   │
│  cron → run.sh <cmd> → python -m autoblog.main    │
│                                                   │
│  discover  → SQLite topics queue                  │
│  publish   → writer → reviewer → publisher        │
│              → INSERT INTO bisdak.posts (draft)   │
│              → Resend email to operator           │
│  keywords  → refresh top-10 keyword list          │
│  health    → weekly report + dead-man's switch    │
│  purge-    → delete autoblog drafts older than 7d │
│   drafts                                          │
└───────────────────────────────────────────────────┘
                  │ psycopg over TLS
                  ▼
        BisDak Postgres (Supabase pooler :6543)
                  │
                  ▼
   /admin/posts/<id>  ← operator reviews + publishes
```

## Prerequisites

- Linux VPS with Python 3.11+ and cron
- `claude` CLI installed and OAuth'd to a Claude Pro/Max subscription
  (this pipeline runs on the subscription, not on per-token API billing)
- Network egress to: Supabase Postgres, Resend API, Claude CLI, RSS feeds,
  GDELT, and the NZ government / community URLs in `discover.py`
- Resend account + verified sender domain

## Install

```bash
# As root (or with sudo):
sudo mkdir -p /opt/bisdak-autoblog /var/log/bisdak-autoblog /var/lib/bisdak-autoblog
sudo chown -R "$(whoami):$(whoami)" /opt/bisdak-autoblog /var/log/bisdak-autoblog /var/lib/bisdak-autoblog

# Sync this directory to the VPS:
rsync -av --exclude='.venv' --exclude='data' --exclude='*.pyc' \
  ./ user@vps:/opt/bisdak-autoblog/

# On the VPS:
cd /opt/bisdak-autoblog
./setup.sh

# Then edit /opt/bisdak-autoblog/.env with secrets.
```

## Configuration

Two files:

- `.env` — secrets and per-host config (DATABASE_URL, RESEND_API_KEY,
  NOTIFY_EMAIL, kill switches). chmod 600.
- `config.toml` — pipeline tunables (cadence, word counts, models,
  daily LLM call cap). Safe to commit.

## Cron

**Check the VPS clock first** with `date` — the entries below are written
for a VPS on NZ local time (which is how this VPS and the existing
InspectPro autoblog are configured). If your VPS is on UTC, shift each
hour value by +12 (NZST) or +13 (NZDT).

```cron
# discover daily at 02:00 NZT (1h before InspectPro autoblog's 03:00 discover)
0 2 * * *    /opt/bisdak-autoblog/run.sh discover

# publish Mon-Fri at 09:00 NZT (between InspectPro's 06:00 and 14:00 publish)
0 9 * * 1-5  /opt/bisdak-autoblog/run.sh publish

# weekly keyword refresh at 02:00 NZT Sunday
0 2 * * 0    /opt/bisdak-autoblog/run.sh keywords

# weekly health report + dead-mans switch at 09:00 NZT Monday
0 9 * * 1    /opt/bisdak-autoblog/run.sh health

# weekly autoblog-draft purge (>7d old) at 22:00 NZT Sunday
0 22 * * 0   /opt/bisdak-autoblog/run.sh purge-drafts
```

`run.sh` acquires an exclusive `flock` on
`/var/lib/bisdak-autoblog/<cmd>.lock` so overlapping cron ticks are
safe — the second invocation logs a WARN and exits 0.

## Kill switches

Two env vars in `.env`:

- `AUTOBLOG_DISCOVER_ENABLED=false` → the `discover` cron tick logs a
  warning and exits without touching SQLite.
- `AUTOBLOG_PUBLISH_ENABLED=false` → the `publish` cron tick still runs
  the writer + reviewer, but **does not INSERT into bisdak.posts**.
  Instead it emails the full draft body to the operator (subject prefixed
  `[KILL SWITCH]`) so it can be reviewed and pasted manually.

The cron schedule itself stays untouched — flip env vars and changes
take effect on the next tick.

## Daily LLM call cap

`config.toml [budget] max_llm_calls_per_day` (default `60`). Each call to
the Claude CLI is logged to SQLite. When the cap is hit the pipeline
halts with a budget alert. Subscription billing means cost isn't the
concern — runaway loops (e.g. reviewer-revise infinite cycle) are.

## Citation gate

Every draft must, before publish:

1. Have no broken outbound URLs (HEAD + GET-fallback check)
2. Contain ≥ 2 distinct verified outbound URLs
3. Contain ≥ 1 URL from `AUTHORITATIVE_DOMAINS` (gov.nz / established NZ
   media / philembassy.org.nz / .ac.nz / .org.nz). See `link_checker.py`.

Drafts that fail the gate are moved to status='quarantined' in SQLite
and the operator is emailed.

## Safety rails

- **Slug retry** — `posts.slug` is UNIQUE. The publisher retries
  `slug-2`, `slug-3`, …, up to 5 times before quarantining.
- **Reserved slugs** — `slugs.RESERVED_SLUGS` includes every bisdak
  top-level route. Add to that frozenset when new routes are added.
- **Disclaimer footer** — every draft body ends with an "AI-assisted"
  disclaimer. The body is committed with the disclaimer in place; the
  human reviewer can soften the wording via the admin Edit action.
- **Refusal categories** — both the research and writer prompts
  enumerate categories the LLM must refuse to draft (immigration legal
  advice for individuals, named-individual reputational content,
  political endorsements, specific medical / financial advice, etc.).
- **Risk flags** — the reviewer surfaces specific concerns
  (`mentions_immigration`, `mentions_political`, …) into the post's
  `meta.risk_flags` so the operator sees them on the admin review page.
- **Dead-man's switch** — `health` checks the most recent autoblog row
  in bisdak.posts. If older than 36h Mon-Fri (72h including weekend),
  it sends a separate alert email.

## Local debugging

```bash
# Activate the venv
source /opt/bisdak-autoblog/.venv/bin/activate

# Trigger any command outside cron
/opt/bisdak-autoblog/run.sh discover
/opt/bisdak-autoblog/run.sh publish
/opt/bisdak-autoblog/run.sh health

# Inspect the metadata DB
sqlite3 /opt/bisdak-autoblog/data/bisdak_autoblog.sqlite
sqlite> SELECT id, status, score, title FROM topics ORDER BY id DESC LIMIT 20;
sqlite> SELECT day, COUNT(*) FROM llm_calls GROUP BY day ORDER BY day DESC LIMIT 7;
sqlite> SELECT stage, error, created_at FROM failures ORDER BY id DESC LIMIT 10;

# Tail today's log
tail -f /var/log/bisdak-autoblog/publish_$(date +%Y%m%d).log
```

## Inspecting drafts on bisdak

```bash
# In bisdak's Supabase SQL editor:
SELECT id, slug, title, created_at, meta
FROM posts
WHERE status = 'draft'
  AND meta ->> 'source' = 'autoblog'
ORDER BY created_at DESC
LIMIT 20;
```

The admin review page is at `https://bisdak.co.nz/admin/posts/<id>`.
Drafts include `meta.source_urls`, `meta.risk_flags`, `meta.draft_model`,
`meta.review_model`, `meta.topic_score`, `meta.review_revisions`.

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| No drafts arriving | claude CLI logged out, or kill switch on | `claude /status`, check `.env` |
| Citation gate quarantines most topics | Source list yielding hallucinated links | Tighten `discover.py` sources |
| All topics rejected at review | Prompt or domain shift | Read `failures` table, iterate prompts in `prompts/` |
| Slug collisions piling up | Title generation too narrow | Inspect quarantined topics' base slugs |
| `psycopg.errors.OperationalError` "prepared statement already exists" | Old psycopg + new pooler | Upgrade `psycopg[binary]`; `prepare_threshold=None` is already set |
| Anthropic 5xx storms | Outage | `chat()` raises; topic is deferred for retry on next cron |

## Operating notes

- All times in NZT. The VPS clock is UTC; cron entries reflect this.
- The autoblog and InspectPro autoblog share the same VPS but **no
  state**: separate dirs, venvs, SQLite files, log paths, lock paths,
  and user-agent strings.
- `.env` is git-ignored. Do NOT commit secrets.
- The `claude` CLI shares one OAuth session across both autoblog
  installs — that's fine; both pipelines call out non-interactively.

## License

Internal — same license as the bisdak project.
