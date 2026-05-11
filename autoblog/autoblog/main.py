"""
main.py — CLI entrypoint & orchestrator for bisdak-autoblog.

Usage: python -m autoblog.main <discover|publish|keywords|health|purge-drafts>

Pipeline (publish command):
    pick top queued topic
        → research + draft (writer)
        → link health check
        → reviewer (Opus) → revise loop (up to writer.max_revisions)
        → citation gate (≥2 OK links, ≥1 authoritative)
        → publisher.publish_draft → INSERT row in bisdak.posts (status='draft')
        → notifier.send_draft_ready → operator email
"""
from __future__ import annotations

import html as html_mod
import json
import logging
import sys
import traceback
from datetime import datetime, timezone

from . import bisdak as bisdak_db
from . import config
from . import db
from .discover import run_discovery
from .keywords import refresh_top_keywords
from .link_checker import check_links, citation_gate
from .llm import chat as _llm_chat
from .notifier import (
    send_dead_mans_switch,
    send_draft_ready,
    send_failure,
    send_health_report,
)
from .publisher import publish_draft
from .reviewer import review_post
from .slugs import QuarantineTopic
from .writer import generate_post, revise_post

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


def _log_run(command: str, status: str, details: str = "", error_msg: str = "") -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO run_log (command, status, details, error_msg, ended_at) "
            "VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            (command, status, details, error_msg),
        )


def _handle_failure(stage: str, error: str, topic_id: int | None = None,
                    topic_title: str | None = None, retry_count: int = 0) -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO failures (topic_id, stage, error, notified) VALUES (?, ?, ?, 1)",
            (topic_id, stage, error),
        )
    try:
        send_failure(stage, error, topic_title, retry_count=retry_count)
    except Exception as exc:
        logger.error("Failed to send failure notification: %s", exc)


# ── Budget cap ───────────────────────────────────────────────────────────────

def _llm_calls_today() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with db.connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM llm_calls WHERE day = ?", (today,),
        ).fetchone()
    return int(row["n"]) if row else 0


def _budget_check(stage: str) -> bool:
    used = _llm_calls_today()
    cap = config.budget.max_llm_calls_per_day
    if used >= cap:
        msg = f"Daily LLM call budget exhausted ({used}/{cap}) — halting at stage={stage}"
        logger.warning(msg)
        _log_run("publish", "partial", details=msg)
        try:
            send_failure("budget", msg)
        except Exception as exc:
            logger.error("Failed to send budget notification: %s", exc)
        return False
    if used >= int(cap * 0.8) and used < int(cap * 0.8) + 1:
        # Best-effort one-shot 80% alert.
        try:
            send_failure("budget",
                         f"Daily LLM call budget at 80% ({used}/{cap}) — continuing")
        except Exception:
            pass
    return True


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_discover() -> None:
    if not config.DISCOVER_ENABLED:
        logger.warning("AUTOBLOG_DISCOVER_ENABLED=false — skipping discovery")
        _log_run("discover", "ok", details="kill-switch on")
        return
    if not _budget_check("discover"):
        return
    logger.info("Starting topic discovery...")
    try:
        count = run_discovery()
        _log_run("discover", "ok", details=f"Discovered {count} new topics")
        logger.info("Discovery complete: %d new topics.", count)
    except Exception as exc:
        error = traceback.format_exc()
        logger.error("Discovery failed: %s", exc)
        _log_run("discover", "failed", error_msg=str(exc))
        _handle_failure("discovery", error)


def _recover_stuck_topics() -> None:
    with db.connect() as conn:
        stuck = conn.execute(
            "UPDATE topics SET status = 'queued' "
            "WHERE status IN ('writing', 'review')"
        )
        if stuck.rowcount > 0:
            logger.warning("Reset %d stuck topic(s) back to 'queued'", stuck.rowcount)


def _publish_single_topic(topic_id: int) -> None:
    with db.connect() as conn:
        topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    if not topic:
        raise ValueError(f"Topic {topic_id} not found")

    topic_title = topic["title"]
    logger.info("Publishing topic %d: %s", topic_id, topic_title)

    # 1. Generate
    post = generate_post(topic_id)

    # 1b. Pre-review link check — if broken, ask writer to fix once before reviewer sees it
    link_report = check_links(post["body"])
    if link_report["broken"]:
        broken_list = "\n".join(f"  - {url} (HTTP {status})" for url, status in link_report["broken"])
        logger.warning("Pre-review link check found %d broken link(s):\n%s",
                       len(link_report["broken"]), broken_list)
        instructions = (
            "The following outbound URLs in the draft are broken (404/410/DNS). "
            "Replace each with a verified working URL from the research brief's "
            "suggested_citations, OR remove the citation entirely (do NOT invent URLs).\n"
            "Broken URLs:\n" + broken_list
        )
        post = revise_post(topic_id, post, instructions)

    # 2. Review (Opus)
    with db.connect() as conn:
        conn.execute("UPDATE topics SET status = 'review' WHERE id = ?", (topic_id,))
    review_passes = 0
    review = review_post(post)

    while review["verdict"] == "revise" and review_passes < config.writer.max_revisions:
        review_passes += 1
        logger.info("Revision %d for topic %d", review_passes, topic_id)
        post = revise_post(topic_id, post, review["revision_instructions"])
        review = review_post(post)

    if review["verdict"] == "reject":
        logger.warning("Topic %d rejected: %s", topic_id, review.get("issues"))
        with db.connect() as conn:
            conn.execute(
                "UPDATE topics SET status = 'rejected', rejection_reason = ? WHERE id = ?",
                (json.dumps(review.get("issues", [])), topic_id),
            )
        _log_run("publish", "ok", details=f"Topic {topic_id} rejected by reviewer")
        return

    if review["verdict"] == "revise":
        # Exhausted revisions — accept if quality is borderline, else reject
        score = int(review.get("quality_score", 0))
        if score < 6:
            with db.connect() as conn:
                conn.execute(
                    "UPDATE topics SET status = 'rejected', rejection_reason = ? WHERE id = ?",
                    (f"Exhausted revisions (score={score})", topic_id),
                )
            _log_run("publish", "ok", details=f"Topic {topic_id} exhausted revisions")
            return
        logger.info("Topic %d score=%d after %d revisions — accepting", topic_id, score, review_passes)

    # 3. Citation gate (hard publish-time guard)
    final_link_report = check_links(post["body"])
    passed, reason = citation_gate(final_link_report)
    if not passed:
        logger.warning("Topic %d failed citation gate: %s", topic_id, reason)
        with db.connect() as conn:
            conn.execute(
                "UPDATE topics SET status = 'quarantined', rejection_reason = ? WHERE id = ?",
                (f"citation_gate: {reason}", topic_id),
            )
        _log_run("publish", "ok", details=f"Topic {topic_id} citation_gate: {reason}")
        _handle_failure("publish", f"Citation gate failed: {reason}",
                        topic_id=topic_id, topic_title=topic_title)
        return

    # Merge reviewer's risk_flags into metadata so they surface on the admin page
    post["metadata"]["risk_flags"] = list(review.get("risk_flags") or [])
    post["metadata"]["review_revisions"] = review_passes
    post["metadata"]["quality_score"] = int(review.get("quality_score", 0))

    # 4. Publish (kill-switch aware)
    if not config.PUBLISH_ENABLED:
        logger.warning(
            "AUTOBLOG_PUBLISH_ENABLED=false — skipping insert; sending review email "
            "with full draft body for manual paste",
        )
        send_draft_ready(
            post_id="(none — kill switch)",
            title=post["title"],
            excerpt=post["excerpt"],
            slug=post["slug"],
            word_count=post["word_count"],
            review_passes=review_passes,
            quality_score=int(review.get("quality_score", 0)),
            risk_flags=list(review.get("risk_flags") or []),
            source_urls=list(post["metadata"].get("source_urls") or []),
            body=post["body"],
            kill_switch_on=True,
        )
        _log_run("publish", "ok", details="kill-switch on — no insert")
        return

    try:
        post_id = publish_draft(
            title=post["title"],
            slug=post["slug"],
            excerpt=post["excerpt"],
            content=post["body"],
            meta=post["metadata"],
        )
    except QuarantineTopic as exc:
        logger.warning("Topic %d quarantined: %s", topic_id, exc)
        with db.connect() as conn:
            conn.execute(
                "UPDATE topics SET status = 'quarantined', rejection_reason = ? WHERE id = ?",
                (str(exc), topic_id),
            )
        _log_run("publish", "ok", details=f"Topic {topic_id} quarantined: {exc}")
        return

    # 5. Record in metadata DB
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO posts (topic_id, slug, title, word_count, review_passes, "
            "review_score, bisdak_post_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (topic_id, post["slug"], post["title"], post["word_count"],
             review_passes, "pass", post_id),
        )
        conn.execute(
            "UPDATE topics SET status = 'published', "
            "published_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
            (topic_id,),
        )
        if topic["primary_keyword"]:
            conn.execute(
                "UPDATE keywords SET covered = 1 WHERE LOWER(keyword) = LOWER(?)",
                (topic["primary_keyword"],),
            )

    # 6. Notify
    send_draft_ready(
        post_id=post_id,
        title=post["title"],
        excerpt=post["excerpt"],
        slug=post["slug"],
        word_count=post["word_count"],
        review_passes=review_passes,
        quality_score=int(review.get("quality_score", 0)),
        risk_flags=list(review.get("risk_flags") or []),
        source_urls=list(post["metadata"].get("source_urls") or []),
        body=post["body"],
    )
    _log_run("publish", "ok", details=f"Published draft post_id={post_id}")
    logger.info("Draft ready at %s/admin/posts/%s", config.SITE_URL, post_id)


def cmd_publish() -> None:
    if not _budget_check("publish"):
        return

    logger.info("Starting publish pipeline...")

    # Weekly cap
    with db.connect() as conn:
        published_this_week = conn.execute(
            "SELECT COUNT(*) AS n FROM topics WHERE status = 'published' "
            "AND published_at >= datetime('now', '-7 days')"
        ).fetchone()["n"]
    if published_this_week >= config.schedule.posts_per_week:
        msg = f"Weekly cap reached ({published_this_week}/{config.schedule.posts_per_week})"
        logger.info(msg)
        _log_run("publish", "ok", details=msg)
        return

    _recover_stuck_topics()

    with db.connect() as conn:
        topic = conn.execute(
            "SELECT * FROM topics WHERE status = 'queued' ORDER BY score DESC LIMIT 1"
        ).fetchone()

    if not topic:
        logger.info("No queued topics — skipping")
        _log_run("publish", "ok", details="No topics in queue")
        return

    topic_id = topic["id"]
    topic_title = topic["title"]
    try:
        _publish_single_topic(topic_id)
    except Exception as exc:
        error = traceback.format_exc()
        logger.error("Publish failed for topic %d: %s", topic_id, exc)
        with db.connect() as conn:
            cur = conn.execute("SELECT retry_count FROM topics WHERE id = ?", (topic_id,)).fetchone()
            retry_count = cur["retry_count"] if cur else 0
        if retry_count < 1:
            with db.connect() as conn:
                conn.execute(
                    "UPDATE topics SET retry_count = retry_count + 1, last_error = ?, "
                    "status = 'queued' WHERE id = ?",
                    (str(exc), topic_id),
                )
            _log_run("publish", "failed", error_msg=f"Will retry: {exc}")
            _handle_failure("publish", error, topic_id=topic_id, topic_title=topic_title, retry_count=0)
        else:
            with db.connect() as conn:
                conn.execute(
                    "UPDATE topics SET status = 'rejected', rejection_reason = ?, "
                    "last_error = ? WHERE id = ?",
                    (f"Failed after {retry_count + 1} attempts: {exc}", str(exc), topic_id),
                )
            _log_run("publish", "failed", error_msg=str(exc))
            _handle_failure("publish", error, topic_id=topic_id,
                            topic_title=topic_title, retry_count=retry_count)


def cmd_keywords() -> None:
    if not _budget_check("keywords"):
        return
    logger.info("Refreshing keywords...")
    try:
        kws = refresh_top_keywords()
        _log_run("keywords", "ok", details=f"Top keywords: {kws}")
    except Exception as exc:
        error = traceback.format_exc()
        logger.error("Keywords failed: %s", exc)
        _log_run("keywords", "failed", error_msg=str(exc))
        _handle_failure("keywords", error)


def _dead_mans_switch() -> None:
    """If no autoblog draft has landed in 36h Mon-Fri (72h including weekend), alert."""
    try:
        last_ts = bisdak_db.last_autoblog_draft_time()
    except Exception as exc:
        logger.warning("dead-man's-switch: %s", exc)
        return
    if not last_ts:
        send_dead_mans_switch(hours_since_last=9999)
        return
    last_dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
    if last_dt.tzinfo is None:
        last_dt = last_dt.replace(tzinfo=timezone.utc)
    hours = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
    weekday = datetime.now(timezone.utc).weekday()  # Mon=0, Sun=6
    threshold = 36 if weekday < 5 else 72
    if hours > threshold:
        send_dead_mans_switch(hours_since_last=hours)


def cmd_health() -> None:
    logger.info("Generating health report...")
    try:
        with db.connect() as conn:
            published = conn.execute(
                "SELECT COUNT(*) AS n FROM topics WHERE status = 'published' "
                "AND published_at >= datetime('now', '-7 days')"
            ).fetchone()["n"]
            queued = conn.execute(
                "SELECT COUNT(*) AS n FROM topics WHERE status = 'queued'"
            ).fetchone()["n"]
            quarantined = conn.execute(
                "SELECT COUNT(*) AS n FROM topics WHERE status = 'quarantined' "
                "AND created_at >= datetime('now', '-7 days')"
            ).fetchone()["n"]
            total_kw = conn.execute("SELECT COUNT(*) AS n FROM keywords").fetchone()["n"]
            covered_kw = conn.execute(
                "SELECT COUNT(*) AS n FROM keywords WHERE covered = 1"
            ).fetchone()["n"]
            sources = conn.execute(
                "SELECT source, COUNT(*) AS n FROM topics "
                "WHERE created_at >= datetime('now', '-7 days') GROUP BY source"
            ).fetchall()
            failures = conn.execute(
                "SELECT stage, COUNT(*) AS n FROM failures "
                "WHERE created_at >= datetime('now', '-7 days') GROUP BY stage"
            ).fetchall()
            rejected = conn.execute(
                "SELECT COUNT(*) AS n FROM topics WHERE status = 'rejected' "
                "AND created_at >= datetime('now', '-7 days')"
            ).fetchone()["n"]
            llm_calls = conn.execute(
                "SELECT day, COUNT(*) AS n FROM llm_calls "
                "WHERE day >= date('now', '-7 days') GROUP BY day ORDER BY day"
            ).fetchall()

        attempted = published + rejected + quarantined
        success_rate = (
            f"{published}/{attempted} ({published * 100 // attempted}%)"
            if attempted else "N/A"
        )

        def _esc(text: object) -> str:
            return html_mod.escape(str(text))

        report = f"""<h2>BisDak Autoblog — Weekly Health Report</h2>
<p><strong>Period:</strong> Last 7 days</p>

<h3>Summary</h3>
<ul>
  <li><strong>Drafts inserted into bisdak.posts:</strong> {published}</li>
  <li><strong>Publish success rate:</strong> {success_rate}</li>
  <li><strong>Topics in queue:</strong> {queued}</li>
  <li><strong>Quarantined this week:</strong> {quarantined}</li>
  <li><strong>Keyword coverage:</strong> {covered_kw}/{total_kw}</li>
</ul>

<h3>Discovery sources (last 7 days)</h3>
<ul>
{"".join(f"<li>{_esc(r['source'])}: {r['n']}</li>" for r in sources) or "<li>No new topics this week</li>"}
</ul>

<h3>Failures (last 7 days)</h3>
<ul>
{"".join(f"<li>{_esc(r['stage'])}: {r['n']}</li>" for r in failures) or "<li>None</li>"}
</ul>

<h3>LLM calls per day</h3>
<ul>
{"".join(f"<li>{_esc(r['day'])}: {r['n']}</li>" for r in llm_calls) or "<li>No calls</li>"}
</ul>
<p>Daily cap: {config.budget.max_llm_calls_per_day} calls.</p>
"""
        send_health_report(report)
        _dead_mans_switch()
        _log_run("health", "ok")
    except Exception as exc:
        error = traceback.format_exc()
        logger.error("Health report failed: %s", exc)
        _log_run("health", "failed", error_msg=str(exc))
        _handle_failure("health", error)


def cmd_purge_drafts() -> None:
    """Hard-delete autoblog-sourced drafts older than 7 days from bisdak.posts."""
    logger.info("Purging old autoblog drafts...")
    try:
        n = bisdak_db.purge_old_autoblog_drafts(older_than_days=7)
        _log_run("purge-drafts", "ok", details=f"Purged {n} drafts")
    except Exception as exc:
        error = traceback.format_exc()
        logger.error("Purge failed: %s", exc)
        _log_run("purge-drafts", "failed", error_msg=str(exc))
        _handle_failure("publish", error)  # 'publish' fits in the failures.stage enum


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: python -m autoblog.main <discover|publish|keywords|health|purge-drafts>",
            file=sys.stderr,
        )
        sys.exit(1)

    command = sys.argv[1]
    db.assert_env_permissions()
    db.init_db()

    commands = {
        "discover": cmd_discover,
        "publish": cmd_publish,
        "keywords": cmd_keywords,
        "health": cmd_health,
        "purge-drafts": cmd_purge_drafts,
    }

    if command not in commands:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

    commands[command]()


if __name__ == "__main__":
    main()
