---
title: Claude CLI not found under cron despite being installed
date: 2026-05-11
tags: [cron, claude-cli, path, vps, autoblog, llm]
severity: high
related:
  - autoblog/autoblog/llm.py
  - autoblog/run.sh
  - autoblog/README.md
---

# Claude CLI not found under cron despite being installed

## Symptom

A cron-driven Python service that shells out to `claude -p` fails with:

```
RuntimeError: claude -p failed (exit=127, model=sonnet):
  /bin/sh: claude: command not found
```

…but in an interactive SSH session as the same user, `which claude` returns
a real path and `claude --version` works.

This came up porting the autoblog: in interactive shells the LLM pipeline
ran fine; via cron, every `publish` tick died at the first LLM call.

## Why

Two facts conspire:

1. The `claude` CLI installed via Claude Code lands at
   `~/.local/bin/claude` (versioned symlink to
   `~/.local/share/claude/versions/<X.Y.Z>`).
2. Cron does **not** load the user's `.bashrc` / `.profile`. It starts
   with a minimal PATH — typically `/usr/bin:/bin` plus whatever `cron`
   itself was compiled with. `~/.local/bin` is not on that PATH.

So `shutil.which("claude")` (and `/bin/sh -c "claude …"`) succeed in an
interactive shell, but return `None` when the same Python process is
spawned from cron.

The InspectPro autoblog masked this by hard-coding a fallback path in
`llm.py`:

```python
CLAUDE_BIN = shutil.which("claude") or "/home/alexp/.local/bin/claude"
```

`shutil.which()` returns `None` under cron, so the fallback kicks in.
The bisdak port initially had `or "/usr/local/bin/claude"` — wrong path,
so cron always failed.

## Fix

Two defences, both small:

**1. Export PATH in the cron wrapper** (`run.sh`):

```bash
export PYTHONPATH="$SCRIPT_DIR"
export AUTOBLOG_BASE_DIR="$SCRIPT_DIR"
# Cron starts with a minimal PATH and doesn't load .bashrc; the `claude`
# CLI lives under the operator's home (the InspectPro autoblog uses the
# same path).
export PATH="$HOME/.local/bin:$PATH"
```

Now `shutil.which("claude")` resolves correctly inside the spawned Python.

**2. Extend the fallback chain** in `llm.py`:

```python
CLAUDE_BIN = (
    shutil.which("claude")
    or os.path.expanduser("~/.local/bin/claude")
    or "/usr/local/bin/claude"
)
```

This is belt-and-braces — covers any future invocation that bypasses
`run.sh` (e.g. `python -m autoblog.main` straight from the venv during
operator debugging).

## Prevention

- Any cron-driven script that needs a binary outside `/usr/bin`:`/bin`
  must either export PATH itself or invoke the binary by absolute path.
  Don't rely on `which` succeeding under cron.
- `setup.sh` does `which claude || warn`. Worth checking on every
  re-deploy because the symlink target moves on claude updates.
- If you ever migrate to a different VPS user, the hard-coded fallback
  becomes wrong silently. `$HOME/.local/bin` expansion (above) is
  portable; the `/home/alexp/...` form is not.

## Related

- Same pattern applies to any non-system binary the cron job needs:
  npm-installed CLIs, custom-compiled binaries, anything in
  `~/.local/`, `~/.cargo/bin`, `~/.bun/bin`, etc.
- `docs/solutions/2026-05-11-psycopg-supabase-pooler.md` — another
  cron/external-process gotcha for the same autoblog deploy
  (`prepare_threshold=None` for Supabase pooler).
