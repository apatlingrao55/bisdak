"""
config.py — Load autoblog/config.toml and expose typed settings.

Falls back to hardcoded defaults if the file is missing or unparseable,
so the pipeline always has a valid configuration.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env from project root (set by run.sh; defaults to /opt/bisdak-autoblog)
_PROJECT_DIR = Path(os.environ.get("AUTOBLOG_BASE_DIR", "/opt/bisdak-autoblog")).resolve()
load_dotenv(_PROJECT_DIR / ".env")

_CONFIG_PATH = _PROJECT_DIR / "config.toml"


def _load() -> dict:
    try:
        import tomllib  # Python 3.11+
    except ImportError:
        try:
            import tomli as tomllib  # type: ignore[no-redef]
        except ImportError:
            logger.warning("config.toml: neither tomllib nor tomli available — using defaults.")
            return {}

    if not _CONFIG_PATH.exists():
        logger.warning("config.toml not found at %s — using defaults.", _CONFIG_PATH)
        return {}

    try:
        with open(_CONFIG_PATH, "rb") as f:
            return tomllib.load(f)
    except Exception as exc:
        logger.error("Failed to load config.toml: %s — using defaults.", exc)
        return {}


_raw = _load()


def _bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


# ── Secrets / runtime env ────────────────────────────────────────────────────

RESEND_API_KEY: str = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL: str = os.environ.get("FROM_EMAIL", "hello@mail.bisdak.co.nz")
NOTIFY_EMAIL: str = os.environ.get("NOTIFY_EMAIL", "hello@bisdak.co.nz")
SITE_URL: str = os.environ.get("SITE_URL", "https://bisdak.co.nz")
TELEGRAM_BOT_TOKEN: str = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID: str = os.environ.get("TELEGRAM_CHAT_ID", "")

# Postgres connection for bisdak — point at the same DATABASE_URL the Next.js app uses.
DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

# Kill switches. Default both ON so a missing env doesn't silently halt the pipeline.
PUBLISH_ENABLED: bool = _bool_env("AUTOBLOG_PUBLISH_ENABLED", True)
DISCOVER_ENABLED: bool = _bool_env("AUTOBLOG_DISCOVER_ENABLED", True)


# ── Discovery ────────────────────────────────────────────────────────────────

class _Discovery:
    min_delay: float = _raw.get("discovery", {}).get("min_delay", 3.0)
    max_delay: float = _raw.get("discovery", {}).get("max_delay", 7.0)
    max_topics_per_run: int = _raw.get("discovery", {}).get("max_topics_per_run", 20)
    min_score: int = _raw.get("discovery", {}).get("min_score", 40)


# ── Writer ───────────────────────────────────────────────────────────────────

class _Writer:
    min_words: int = _raw.get("writer", {}).get("min_words", 1200)
    max_words: int = _raw.get("writer", {}).get("max_words", 1800)
    max_revisions: int = _raw.get("writer", {}).get("max_revisions", 2)
    draft_model: str = _raw.get("writer", {}).get("draft_model", "sonnet")
    review_model: str = _raw.get("writer", {}).get("review_model", "opus")


# ── Budget ───────────────────────────────────────────────────────────────────

class _Budget:
    # Per-day cap on LLM calls (any model). Subscription billing → no per-call cost,
    # but we still cap to prevent runaway loops (e.g. reviewer-revise infinite cycle).
    max_llm_calls_per_day: int = _raw.get("budget", {}).get("max_llm_calls_per_day", 60)


# ── Schedule ─────────────────────────────────────────────────────────────────

class _Schedule:
    posts_per_week: int = _raw.get("schedule", {}).get("posts_per_week", 5)


discovery = _Discovery()
writer = _Writer()
budget = _Budget()
schedule = _Schedule()
