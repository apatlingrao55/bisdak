---
title: psycopg against Supabase's transaction pooler
date: 2026-05-11
tags: [python, postgres, supabase, pooler, psycopg]
related: [autoblog, publisher, lib/db/index.ts]
---

# psycopg against Supabase's transaction pooler

## Problem

External Python processes that talk to bisdak's Postgres (e.g. the autoblog
publisher at `autoblog/autoblog/publisher.py`) get random
`psycopg.errors.DuplicatePreparedStatement` errors if they use psycopg's
default settings. Symptoms: first call works, subsequent calls fail with
"prepared statement … already exists".

## Why

`DATABASE_URL` points at Supabase's **transaction pooler** on port 6543
(`db.PROJECT.supabase.co:6543`). The pooler reuses backend connections
across client sessions, so server-side prepared statements created in one
request can collide with a different request reusing the same backend.

The bisdak Next.js app sidesteps this in `lib/db/index.ts` by passing
`prepare: false` to the `postgres` driver. The Python equivalent is:

```python
import psycopg
psycopg.connect(DATABASE_URL, prepare_threshold=None)
```

`prepare_threshold=None` disables psycopg's automatic statement preparation
entirely — every query is sent as plain SQL.

## Fix

For any external Python writer talking to bisdak Postgres, open the
connection like this:

```python
# autoblog/autoblog/bisdak.py
import psycopg
from psycopg.rows import dict_row

conn = psycopg.connect(
    DATABASE_URL,
    prepare_threshold=None,
    connect_timeout=10,
    row_factory=dict_row,
)
```

Keep connections short-lived (no in-process pool). Cron-triggered scripts
serialised by `flock` don't benefit from pooling and it complicates
failure modes.

## Related

- `lib/db/index.ts` — Next.js side uses the same pooler URL with `prepare: false`
- Supabase docs: "Connection pooling" → transaction mode (port 6543) vs session mode (5432)
- If you need server-side prepared statements (rare), switch to the session pooler at port 5432 — but you pay in connection count.
