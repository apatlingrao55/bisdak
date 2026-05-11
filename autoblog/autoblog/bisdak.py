"""
bisdak.py — Helpers for talking to bisdak's Postgres.

Centralises the psycopg connection settings (Supabase pooler-compatible:
prepare_threshold=None) and the small read queries the rest of the
pipeline needs against the live `posts` table.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from . import config

logger = logging.getLogger(__name__)


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    """Open a short-lived psycopg connection to bisdak's Postgres.

    `prepare_threshold=None` disables server-side prepared statements, which
    is mandatory when DATABASE_URL points at Supabase's transaction pooler
    (the default in bisdak).
    """
    if not config.DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is empty — set it in /opt/bisdak-autoblog/.env "
            "(use the same value as bisdak's Vercel app)."
        )
    conn = psycopg.connect(
        config.DATABASE_URL,
        prepare_threshold=None,
        connect_timeout=10,
        row_factory=dict_row,
    )
    try:
        yield conn
    finally:
        conn.close()


def existing_slugs() -> set[str]:
    """All slugs currently in bisdak's `posts` table (draft + published).

    Used by writer/discover for duplicate detection. Returns a set so
    `if slug in existing_slugs()` is O(1).
    """
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT slug FROM posts")
            return {row["slug"] for row in cur.fetchall()}


def recent_published_posts(limit: int = 3) -> list[dict]:
    """Pull the N most recent published posts. Writer uses these as style
    examples (so generated drafts match the house voice)."""
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, slug, excerpt, content
                FROM posts
                WHERE status = 'published'
                ORDER BY published_at DESC NULLS LAST, created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return list(cur.fetchall())


def last_autoblog_draft_time() -> str | None:
    """ISO timestamp of the most recent autoblog-sourced row in `posts`.
    Used by the dead-man's-switch in `health`."""
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT MAX(created_at) AS ts
                FROM posts
                WHERE meta ->> 'source' = 'autoblog'
                """
            )
            row = cur.fetchone()
            return row["ts"].isoformat() if row and row["ts"] else None


def purge_old_autoblog_drafts(older_than_days: int = 7) -> int:
    """Hard-delete autoblog-sourced drafts older than N days.

    Three filters combined make this safe — never nukes human drafts:
      * status = 'draft'
      * author_name = 'BisDak Team'  (schema default; human drafts may differ)
      * meta ->> 'source' = 'autoblog'
    """
    sql = """
        DELETE FROM posts
        WHERE status = 'draft'
          AND author_name = 'BisDak Team'
          AND meta ->> 'source' = 'autoblog'
          AND created_at < NOW() - (%s || ' days')::interval
        RETURNING id
    """
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (str(older_than_days),))
            ids = [row["id"] for row in cur.fetchall()]
            conn.commit()
    logger.info("Purged %d autoblog draft(s) older than %dd", len(ids), older_than_days)
    return len(ids)
