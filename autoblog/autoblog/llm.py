"""
llm.py — Claude CLI subprocess wrapper.

Calls `claude -p` non-interactively. Uses OAuth from ~/.claude/ (Pro/Max
subscription). Stateless per call: each invocation spawns a fresh process.

Per-day call accounting: every call (success or failure) is logged to
the local SQLite `llm_calls` table so the budget cap in main.py can
short-circuit further calls once the daily limit is reached.
"""
from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import time
from datetime import datetime, timezone

from . import db

logger = logging.getLogger(__name__)

CLAUDE_BIN = shutil.which("claude") or "/usr/local/bin/claude"

NEUTRAL_SYSTEM_PROMPT = (
    "You are a helpful assistant. Follow the user's instructions exactly."
)

DISALLOWED_TOOLS = "Bash Edit Write Read WebFetch WebSearch Skill Agent NotebookEdit"

CALL_TIMEOUT_SECONDS: dict[str, int] = {
    "opus": 600,
    "sonnet": 480,
}
CALL_TIMEOUT_DEFAULT = 480


FALLBACK_MODEL: dict[str, str] = {
    "opus": "sonnet",
}


def _build_argv(model: str) -> list[str]:
    argv = [
        CLAUDE_BIN,
        "-p",
        "--model", model,
        "--output-format", "text",
        "--system-prompt", NEUTRAL_SYSTEM_PROMPT,
        "--disable-slash-commands",
        "--disallowedTools", DISALLOWED_TOOLS,
        "--no-session-persistence",
    ]
    fallback = FALLBACK_MODEL.get(model)
    if fallback:
        argv += ["--fallback-model", fallback]
    return argv


def _build_env() -> dict[str, str]:
    base = os.environ
    keep = {"HOME", "PATH", "LANG", "USER", "LC_ALL"}
    env = {k: base[k] for k in keep if k in base}
    # Force OAuth/subscription path, never fall back to API-key billing.
    env.pop("ANTHROPIC_API_KEY", None)
    return env


def _record_call(model: str, duration_ms: int, success: bool) -> None:
    """Best-effort write to the llm_calls accounting table. Never raises."""
    try:
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with db.connect() as conn:
            conn.execute(
                "INSERT INTO llm_calls (day, model, success, duration_ms) VALUES (?, ?, ?, ?)",
                (day, model, int(success), duration_ms),
            )
    except Exception as exc:
        logger.warning("Failed to record llm_call: %s", exc)


def chat(model: str, prompt: str) -> str:
    """Send a single-turn prompt to `claude -p` and return the assistant text."""
    argv = _build_argv(model)
    env = _build_env()
    timeout = CALL_TIMEOUT_SECONDS.get(model, CALL_TIMEOUT_DEFAULT)
    start = time.monotonic()
    try:
        result = subprocess.run(
            argv,
            input=prompt.encode("utf-8"),
            capture_output=True,
            cwd="/tmp",
            env=env,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        _record_call(model, duration_ms, success=False)
        raise RuntimeError(
            f"claude -p timeout after {timeout}s (model={model})"
        ) from exc

    duration_ms = int((time.monotonic() - start) * 1000)
    if result.returncode != 0:
        _record_call(model, duration_ms, success=False)
        stderr_tail = (result.stderr or b"").decode("utf-8", errors="replace")[-500:]
        raise RuntimeError(
            f"claude -p failed (exit={result.returncode}, model={model}): {stderr_tail}"
        )

    text = (result.stdout or b"").decode("utf-8", errors="replace").strip()
    _record_call(model, duration_ms, success=bool(text))
    if not text:
        raise ValueError(f"claude -p returned empty response (model={model})")
    return text


def parse_json(text: str) -> dict | list:
    """Parse JSON from LLM response, stripping markdown fences and ignoring trailing text."""
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    obj, _ = json.JSONDecoder().raw_decode(cleaned.strip())
    return obj
