"""
publisher.py — Insert a draft into bisdak's Postgres `posts` table.

Replaces InspectPro's git-commit-MDX publisher entirely. The Python service
opens a short-lived psycopg connection (Supabase pooler-compatible), inserts
a single row with status='draft' + meta jsonb provenance, and returns the
new row id. No filesystem, no git, no Vercel auto-deploy.

Slug uniqueness is handled by retry-on-conflict — the bisdak `posts.slug`
column has a UNIQUE constraint. If retries are exhausted, the topic is
quarantined.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import psycopg

from . import bisdak
from .slugs import QuarantineTopic, is_reserved

logger = logging.getLogger(__name__)

_MAX_SLUG_RETRIES = 5  # original slug + -2, -3, -4, -5


def publish_draft(
    *,
    title: str,
    slug: str,
    excerpt: str,
    content: str,
    meta: dict[str, Any],
) -> str:
    """Insert a draft post into bisdak's Postgres. Returns the new post id.

    Retries the slug as `<slug>-2`, `<slug>-3`, … up to 5 times on
    UniqueViolation. Raises QuarantineTopic if the base slug is reserved
    or if all retry candidates collide.
    """
    if is_reserved(slug):
        raise QuarantineTopic(f"slug '{slug}' collides with a reserved bisdak route")

    candidates = [slug] + [f"{slug}-{i}" for i in range(2, _MAX_SLUG_RETRIES + 1)]
    meta_with_source = {"source": "autoblog", **meta}

    with bisdak.connect() as conn:
        with conn.cursor() as cur:
            for candidate in candidates:
                try:
                    cur.execute(
                        """
                        INSERT INTO posts (
                            id, title, slug, excerpt, content,
                            author_name, status, meta,
                            published_at, created_at
                        )
                        VALUES (
                            gen_random_uuid()::text, %s, %s, %s, %s,
                            'BisDak Team', 'draft', %s::jsonb,
                            NOW(), NOW()
                        )
                        RETURNING id
                        """,
                        (
                            title,
                            candidate,
                            excerpt,
                            content,
                            json.dumps(meta_with_source),
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row is None:
                        # Shouldn't happen — INSERT … RETURNING id always yields a row.
                        raise RuntimeError("INSERT RETURNING produced no row")
                    post_id = row["id"]
                    logger.info(
                        "Inserted draft %s (slug=%s, title=%r)",
                        post_id, candidate, title,
                    )
                    return post_id
                except psycopg.errors.UniqueViolation:
                    conn.rollback()
                    logger.warning("Slug collision on '%s' — trying next candidate", candidate)
                    continue

    raise QuarantineTopic(
        f"exhausted slug candidates for base '{slug}' (tried {len(candidates)})"
    )
