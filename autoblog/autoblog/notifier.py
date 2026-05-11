"""
notifier.py — Resend email notifications for bisdak-autoblog.

Three types:
  * draft-ready    — one email per successful insert into bisdak.posts
  * failure        — one email per stage failure
  * health         — weekly summary
"""
from __future__ import annotations

import html as html_mod
import logging
from datetime import datetime, timezone

import resend

from . import config

logger = logging.getLogger(__name__)


def _init_resend() -> None:
    resend.api_key = config.RESEND_API_KEY


def _esc(text: object) -> str:
    return html_mod.escape(str(text or ""))


def _send(subject: str, html: str) -> str:
    """Send an email via Resend. Returns the message id (best effort)."""
    if not config.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping send (subject=%r)", subject)
        return ""
    response = resend.Emails.send({
        "from": f"BisDak Autoblog <{config.FROM_EMAIL}>",
        "to": [config.NOTIFY_EMAIL],
        "reply_to": config.NOTIFY_EMAIL,
        "subject": subject,
        "html": html,
    })
    return response.id if hasattr(response, "id") else response.get("id", "")  # type: ignore[attr-defined]


def send_draft_ready(
    *,
    post_id: str,
    title: str,
    excerpt: str,
    slug: str,
    word_count: int,
    review_passes: int,
    quality_score: int,
    risk_flags: list[str],
    source_urls: list[str],
    body: str,
    kill_switch_on: bool = False,
) -> None:
    """One email per successful draft insert. Deep-links to /admin/posts/<id>."""
    _init_resend()
    admin_url = f"{config.SITE_URL.rstrip('/')}/admin/posts/{post_id}"
    subject_prefix = "[KILL SWITCH] " if kill_switch_on else ""
    subject = f"{subject_prefix}[Autoblog draft] {title}"

    risk_html = (
        "<p><strong>Risk flags:</strong> " + ", ".join(_esc(f) for f in risk_flags) + "</p>"
        if risk_flags else ""
    )
    source_html = ""
    if source_urls:
        items = "".join(
            f'<li><a href="{_esc(u)}">{_esc(u)}</a></li>' for u in source_urls
        )
        source_html = f"<h3>Source URLs</h3><ul>{items}</ul>"

    body_html = f"<pre style='white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:13px;'>{_esc(body)}</pre>"

    html = f"""
<h2>New autoblog draft ready for review</h2>
<p><strong>Title:</strong> {_esc(title)}</p>
<p><strong>Excerpt:</strong> {_esc(excerpt)}</p>
<p><strong>Slug:</strong> /{_esc(slug)}</p>
<p><strong>Words:</strong> {word_count} · <strong>Review passes:</strong> {review_passes} · <strong>Quality:</strong> {quality_score}/10</p>
{risk_html}
<p><a href="{admin_url}" style="background:#36F4A4;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Review in admin →</a></p>
{source_html}
<h3>Full draft body</h3>
{body_html}
"""
    _send(subject, html)
    logger.info("Draft-ready email sent for post %s", post_id)


def send_failure(stage: str, error: str, topic_title: str | None = None, retry_count: int = 0) -> None:
    _init_resend()
    label = topic_title or "system"
    subject = f"[Autoblog FAIL] {stage} — {label}"
    html = f"""
<h2>Autoblog pipeline failure</h2>
<p><strong>Stage:</strong> {_esc(stage)}</p>
<p><strong>Topic:</strong> {_esc(topic_title) or 'N/A'}</p>
<p><strong>Retry attempt:</strong> {retry_count + 1}</p>
<p><strong>Timestamp (UTC):</strong> {datetime.now(timezone.utc).isoformat()}</p>
<pre>{_esc(error)}</pre>
"""
    _send(subject, html)
    logger.info("Failure email sent: %s — %s", stage, label)


def send_health_report(report_html: str) -> None:
    _init_resend()
    _send("[Autoblog] Weekly health report", report_html)
    logger.info("Health report sent")


def send_dead_mans_switch(hours_since_last: float) -> None:
    """Triggered by the weekly health command if no draft has landed in N hours."""
    _init_resend()
    subject = f"[Autoblog ALERT] No draft in {hours_since_last:.0f}h"
    html = f"""
<h2>Autoblog dead-man's switch</h2>
<p>No autoblog-sourced draft has landed in bisdak.posts in <strong>{hours_since_last:.0f}</strong> hours.</p>
<p>Likely causes:</p>
<ul>
  <li>Cron entries removed or systemd timer disabled</li>
  <li>claude CLI logged out / OAuth expired</li>
  <li>DATABASE_URL points at a stale Supabase pooler</li>
  <li>Discovery returning zero queued topics (low-quality sources)</li>
</ul>
<p>SSH to the VPS and run: <code>tail -n 200 /var/log/bisdak-autoblog/publish_*.log</code></p>
"""
    _send(subject, html)
    logger.info("Dead-man's-switch email sent (%.0fh since last draft)", hours_since_last)
