"""
reviewer.py — Quality review pass using Claude Opus.

Reads the draft + verified link-check results and returns a structured
verdict. Risk flags surfaced in the review are merged into the draft's
`metadata.risk_flags` so the admin review page can show them.
"""
from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

from . import config
from .link_checker import check_links
from .llm import chat, parse_json

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent / "prompts"


def review_post(post: dict) -> dict:
    """Review a draft. Returns:
        {
          "verdict": "pass" | "revise" | "reject",
          "quality_score": int 1-10,
          "issues": list[str],
          "revision_instructions": str,
          "risk_flags": list[str],
        }
    """
    link_report = check_links(post["body"])

    reviewer_prompt = (_PROMPTS_DIR / "reviewer.txt").read_text(encoding="utf-8").format(
        today_date=date.today().isoformat(),
        title=post["title"],
        excerpt=post.get("excerpt", ""),
        slug=post.get("slug", ""),
        content=post["body"],
        min_words=config.writer.min_words,
        max_words=config.writer.max_words,
        word_count=post.get("word_count", len(post["body"].split())),
    )

    # Tell the reviewer what we actually verified.
    link_section = f"\n\nVERIFIED LINK CHECK ({link_report['checked']} external URL(s)):\n"
    if link_report["broken"]:
        link_section += "BROKEN (must fix or remove before publishing):\n"
        link_section += "\n".join(f"  - {url} → {status}" for url, status in link_report["broken"])
        link_section += "\n"
    if link_report["warnings"]:
        link_section += "WARNINGS (timeout/4xx/5xx — verify these are real pages):\n"
        link_section += "\n".join(f"  - {url} → {status}" for url, status in link_report["warnings"])
        link_section += "\n"
    if not link_report["broken"] and not link_report["warnings"]:
        link_section += "All links verified OK.\n"
    reviewer_prompt += link_section

    review_text = chat(config.writer.review_model, reviewer_prompt)

    try:
        review = parse_json(review_text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse review JSON: %s — defaulting to revise", exc)
        return {
            "verdict": "revise",
            "quality_score": 5,
            "issues": ["Reviewer response was not valid JSON"],
            "revision_instructions": "Re-review required — previous reviewer output was malformed.",
            "risk_flags": [],
        }

    if not isinstance(review, dict):
        return {
            "verdict": "revise",
            "quality_score": 5,
            "issues": [f"Reviewer returned {type(review).__name__}, expected object"],
            "revision_instructions": "Re-review required.",
            "risk_flags": [],
        }

    review.setdefault("verdict", "pass")
    review.setdefault("quality_score", 5)
    review.setdefault("issues", [])
    review.setdefault("revision_instructions", "")
    review.setdefault("risk_flags", [])
    review["broken_links"] = link_report["broken"]
    review["link_warnings"] = link_report["warnings"]

    logger.info(
        "Review: verdict=%s score=%s issues=%d risk_flags=%s",
        review["verdict"], review["quality_score"],
        len(review["issues"]), review["risk_flags"],
    )
    return review
