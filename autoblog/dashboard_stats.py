"""dashboard_stats.py — JSON snapshot for server-dashboard.

Consumed by ~/server-dashboard/server.js. Output mirrors the InspectPro
autoblog dashboard_stats.py shape so the dashboard front-end can render
both sections with the same logic.

Differences from the InspectPro version:
  * Reads the bisdak metadata DB at $AUTOBLOG_BASE_DIR/data/bisdak_autoblog.sqlite
  * Includes the quarantined count (bisdak adds this status; InspectPro doesn't)
  * Includes today's LLM call count (used by the budget cap)
  * Recent posts include bisdak_post_id so the dashboard can deep-link to
    /admin/posts/<id> (drafts aren't on the public blog until approved)
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

BASE_DIR = Path(os.environ.get("AUTOBLOG_BASE_DIR", "/opt/bisdak-autoblog"))
DB_PATH = BASE_DIR / "data" / "bisdak_autoblog.sqlite"

try:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    stats = dict(conn.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM topics WHERE status = 'published')   AS published,
            (SELECT COUNT(*) FROM topics WHERE status = 'queued')      AS queued,
            (SELECT COUNT(*) FROM topics WHERE status = 'discovered')  AS discovered,
            (SELECT COUNT(*) FROM topics WHERE status = 'rejected')    AS rejected,
            (SELECT COUNT(*) FROM topics WHERE status = 'quarantined') AS quarantined,
            (SELECT COUNT(*) FROM keywords)                            AS total_keywords,
            (SELECT COUNT(*) FROM keywords WHERE covered = 1)          AS covered_keywords,
            (SELECT COUNT(*) FROM failures WHERE created_at >= datetime('now', '-7 days')) AS failures_week,
            (SELECT COUNT(*) FROM posts    WHERE created_at >= datetime('now', '-7 days')) AS posts_week,
            (SELECT COUNT(*) FROM llm_calls WHERE day = date('now'))   AS llm_calls_today
        """
    ).fetchone())

    posts = [dict(r) for r in conn.execute(
        """
        SELECT title, slug, word_count, review_passes, bisdak_post_id, created_at
        FROM posts
        ORDER BY created_at DESC
        LIMIT 5
        """
    ).fetchall()]

    conn.close()
    print(json.dumps({"stats": stats, "posts": posts}))
except Exception as exc:
    print(json.dumps({"error": str(exc)}), file=sys.stderr)
    sys.exit(1)
