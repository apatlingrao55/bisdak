"""
db.py — SQLite connection manager & schema init for bisdak-autoblog state.

The SQLite DB at $AUTOBLOG_BASE_DIR/data/bisdak_autoblog.sqlite tracks
pipeline state (topics, keywords, runs, failures, llm_calls). Published
posts themselves live in bisdak's Postgres `posts` table — this DB is
local-only metadata.
"""
import logging
import os
import sqlite3
import stat
import sys
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_DIR = Path(os.environ.get("AUTOBLOG_BASE_DIR", "/opt/bisdak-autoblog")).resolve()
_DATA_DIR = _DEFAULT_DIR / "data"
_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _validate_path(p: Path, label: str) -> Path:
    resolved = p.resolve()
    if not str(resolved).startswith(str(_DEFAULT_DIR)):
        raise ValueError(f"Security: {label} path outside allowed directory: {resolved}")
    return resolved


DB_PATH = _validate_path(
    Path(os.environ.get("AUTOBLOG_DB_PATH", str(_DATA_DIR / "bisdak_autoblog.sqlite"))),
    "DB_PATH",
)
SCHEMA_PATH = Path(__file__).parent.parent / "schema.sql"


def assert_env_permissions() -> None:
    """Refuse to run if .env is group/world-readable."""
    env_path = _DEFAULT_DIR / ".env"
    if env_path.exists():
        mode = env_path.stat().st_mode
        if mode & (stat.S_IRGRP | stat.S_IROTH):
            sys.exit(
                f"FATAL: {env_path} is group/world-readable (mode {oct(mode)}). "
                f"Run: chmod 600 {env_path}"
            )


def init_db() -> None:
    """Initialise the database. Safe to call multiple times."""
    with connect() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    if DB_PATH.exists():
        os.chmod(DB_PATH, stat.S_IRUSR | stat.S_IWUSR)


@contextmanager
def connect() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(str(DB_PATH), detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
