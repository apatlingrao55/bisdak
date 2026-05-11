"""
writer.py — Research-and-draft pipeline for bisdak content.

Two stages: research brief (Claude Sonnet) → markdown body (Claude Sonnet).

Output shape (returned dict):
    title         str   — final, SEO-friendly title (≤80 chars)
    slug          str   — clean kebab-case (slugs.slugify)
    excerpt       str   — 1-2 sentence summary for /blog list page
    content       str   — markdown body using bisdak's renderer subset
    body          str   — alias for content (used by link checker)
    metadata      dict  — provenance shape for posts.meta jsonb
    brief         dict  — full research brief (used by revise_post)
    word_count    int

The renderer in bisdak (`app/blog/[slug]/page.tsx` + `lib/blog-renderer.tsx`)
supports only:
    **Whole line**     → h3
    - item             → <ul><li> (consecutive lines grouped)
    > blockquote
    ---                → <hr>
    Inline:  **bold**, *italic*, [text](https://url)
The writer prompt enforces this subset.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from . import bisdak as bisdak_db
from . import config
from . import db
from .llm import chat, parse_json
from .slugs import slugify

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent / "prompts"

# Disclaimer appended to every autoblog body. Inserted by the writer (not the
# renderer) so a human reviewer can soften the wording on the admin page if
# needed. Email link will render as bare text — the bisdak renderer rejects
# non-http(s) hrefs.
_DISCLAIMER = (
    "\n\n---\n\n"
    "*This article was drafted with AI assistance and reviewed before "
    "publication. Spotted an error? Email hello@bisdak.co.nz.*"
)


def _load_style_examples() -> str:
    """Pull the 3 most recent published posts as style references for the writer."""
    try:
        posts = bisdak_db.recent_published_posts(limit=3)
    except Exception as exc:
        logger.warning("Could not fetch style examples: %s — proceeding without", exc)
        return ""
    parts: list[str] = []
    for p in posts:
        parts.append(
            f"--- Example: {p['slug']} ---\n"
            f"Title: {p['title']}\n"
            f"Excerpt: {p['excerpt']}\n\n"
            f"{p['content']}\n"
        )
    return "\n".join(parts)


def _final_title(brief: dict, fallback: str) -> str:
    suggested = brief.get("suggested_title", "")
    if isinstance(suggested, str) and 10 < len(suggested) <= 80:
        return suggested.strip()
    return fallback.strip()


def generate_post(topic_id: int) -> dict:
    """Generate a draft for the topic with id `topic_id`."""
    with db.connect() as conn:
        topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
        if not topic:
            raise ValueError(f"Topic {topic_id} not found")
        conn.execute("UPDATE topics SET status = 'writing' WHERE id = ?", (topic_id,))

    existing = bisdak_db.existing_slugs()
    style_examples = _load_style_examples()

    # ── Step 1: research brief ───────────────────────────────────────────────
    logger.info("Researching topic %d: %s", topic_id, topic["title"])
    research_prompt = (_PROMPTS_DIR / "research.txt").read_text(encoding="utf-8").format(
        topic_title=topic["title"],
        source=topic["source"],
        source_url=topic["source_url"] or "N/A",
        primary_keyword=topic["primary_keyword"] or topic["title"].lower(),
        existing_slugs="\n".join(f"- {s}" for s in sorted(existing)) or "- (none)",
    )
    brief_text = chat(config.writer.draft_model, research_prompt)
    try:
        brief = parse_json(brief_text)
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(f"Failed to parse research brief: {exc}") from exc
    if not isinstance(brief, dict):
        raise RuntimeError(f"Research brief was not a JSON object: {type(brief).__name__}")

    # ── Step 2: draft markdown body ──────────────────────────────────────────
    logger.info("Drafting body for topic %d", topic_id)
    writer_prompt = (_PROMPTS_DIR / "writer.txt").read_text(encoding="utf-8").format(
        research_brief=json.dumps(brief, indent=2),
        style_examples=style_examples or "(none available)",
        min_words=config.writer.min_words,
        max_words=config.writer.max_words,
    )
    body = chat(config.writer.draft_model, writer_prompt)
    body = body.strip()

    # Refuse the draft if Claude emitted a JSON refusal object (per prompt instructions).
    if body.startswith("{") and '"refusal"' in body[:100]:
        try:
            refusal = parse_json(body)
            if isinstance(refusal, dict) and refusal.get("refusal"):
                raise RuntimeError(
                    f"Writer refused to draft topic {topic_id}: "
                    f"{refusal.get('reason', 'unspecified')}"
                )
        except (ValueError, json.JSONDecodeError):
            pass  # body just happened to start with {, not a refusal

    # Tack the disclaimer on (writer prompt explicitly DOES NOT include it,
    # so we know it's appended exactly once).
    body = body + _DISCLAIMER
    word_count = len(body.split())

    # ── Step 3: assemble metadata ────────────────────────────────────────────
    title = _final_title(brief, topic["title"])
    slug = slugify(title)
    excerpt = (brief.get("meta_description") or "").strip()
    if len(excerpt) < 60 or len(excerpt) > 200:
        # Fall back to first paragraph of the body if the brief excerpt is unusable.
        first_para = next((p for p in body.split("\n\n") if p.strip()), title)
        excerpt = (first_para[:180] + "…") if len(first_para) > 180 else first_para

    metadata: dict = {
        "source": "autoblog",
        "topic_id": topic_id,
        "topic_source": topic["source"],
        "topic_source_url": topic["source_url"],
        "topic_score": float(topic["score"] or 0),
        "primary_keyword": topic["primary_keyword"] or brief.get("target_keyword"),
        "secondary_keywords": brief.get("secondary_keywords") or [],
        "source_urls": [
            c.get("url") for c in (brief.get("suggested_citations") or [])
            if isinstance(c, dict) and c.get("url")
        ],
        "draft_model": config.writer.draft_model,
        "review_model": config.writer.review_model,
        "review_revisions": 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "risk_flags": [],
    }

    logger.info("Draft ready: %r (%d words)", title, word_count)
    return {
        "title": title,
        "slug": slug,
        "excerpt": excerpt,
        "content": body,
        "body": body,  # alias for link_checker
        "metadata": metadata,
        "brief": brief,
        "word_count": word_count,
    }


def revise_post(topic_id: int, post: dict, revision_instructions: str) -> dict:
    """Re-draft based on reviewer feedback. Returns the same shape as `generate_post`."""
    style_examples = _load_style_examples()

    writer_prompt = (_PROMPTS_DIR / "writer.txt").read_text(encoding="utf-8").format(
        research_brief=json.dumps(post.get("brief") or {}, indent=2),
        style_examples=style_examples or "(none available)",
        min_words=config.writer.min_words,
        max_words=config.writer.max_words,
    )
    revision_prompt = (
        f"{writer_prompt}\n\n"
        f"REVISION INSTRUCTIONS (fix every issue):\n{revision_instructions}\n\n"
        f"PREVIOUS DRAFT (re-output corrected version, do not reference this draft "
        f"as 'previous' or 'before'):\n{post['body']}\n\n"
        "Output ONLY the markdown body. No commentary, no frontmatter."
    )

    body = chat(config.writer.draft_model, revision_prompt).strip()
    if not body.endswith(_DISCLAIMER.strip()):
        body = body + _DISCLAIMER
    word_count = len(body.split())

    post["body"] = body
    post["content"] = body
    post["word_count"] = word_count
    post["metadata"] = dict(post.get("metadata") or {})
    post["metadata"]["review_revisions"] = (
        int(post["metadata"].get("review_revisions", 0)) + 1
    )
    logger.info("Revision complete: %r (%d words)", post["title"], word_count)
    return post
