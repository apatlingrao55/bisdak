"""
keywords.py — Top 10 keyword research & refresh for bisdak.

Two-step pipeline:
    1. Expand seed keywords via Google Autocomplete (no API key required).
    2. Ask Claude to rank by NZ search demand + Filipino-NZ / jobs-visa relevance.

The resulting top 10 feeds the `keyword_gap` discovery source the next time
`discover` runs.
"""
from __future__ import annotations

import json
import logging
import random
import time
from pathlib import Path

import requests

from . import config
from . import db
from .llm import chat, parse_json

logger = logging.getLogger(__name__)

_AUTOCOMPLETE_URL = "https://suggestqueries.google.com/complete/search"

# Seed terms for the bisdak autoblog domain: Filipino community in NZ + NZ
# jobs / visa / employment. Used both when no DB seeds exist and as a baseline
# for the refresh brainstorm.
SEED_TERMS = [
    # Filipino-NZ community
    "filipino business nz",
    "filipino community new zealand",
    "filipino restaurant auckland",
    "pinoy nz",
    "filipino events nz",
    "filipino store nz",
    "pinoy auckland",
    "filipino wellington",
    "filipino christchurch",
    "remittance philippines nz",
    "send money philippines new zealand",
    "balikbayan box nz",
    # NZ jobs / visa / employment for Filipinos
    "nz work visa for filipino",
    "filipino nurse nz",
    "filipino caregiver new zealand",
    "accredited employer work visa nz",
    "skilled migrant category nz",
    "new zealand visa requirements philippines",
    "filipino jobs auckland",
    "rse visa nz",
    "essential skills visa nz",
    "post study work visa nz",
    "filipino teacher new zealand",
    "filipino it jobs nz",
]


def get_autocomplete_suggestions(query: str) -> list[str]:
    """Fetch Google Autocomplete suggestions for a query (NZ locale)."""
    try:
        resp = requests.get(
            _AUTOCOMPLETE_URL,
            params={"client": "firefox", "q": query, "hl": "en-NZ", "gl": "nz"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return data[1] if len(data) > 1 else []
    except Exception as exc:
        logger.warning("Autocomplete failed for %r: %s", query, exc)
        return []


def expand_keywords(seeds: list[str] | None = None) -> list[str]:
    """Expand seed terms via Google Autocomplete, return unique sorted suggestions."""
    seeds = seeds or SEED_TERMS
    all_suggestions: set[str] = set()
    for seed in seeds:
        suggestions = get_autocomplete_suggestions(seed)
        all_suggestions.update(suggestions)
        time.sleep(random.uniform(config.discovery.min_delay, config.discovery.max_delay))
    return sorted(all_suggestions)


def refresh_top_keywords() -> list[str]:
    """Refresh the top 10 keyword list. Returns the new top-10 keyword strings."""
    logger.info("Refreshing top keywords...")

    with db.connect() as conn:
        # Pull existing slugs from this metadata DB (writer can also see live posts
        # via bisdak.existing_slugs; using local here keeps the prompt cheap).
        existing_slugs = [r["slug"] for r in conn.execute("SELECT slug FROM posts").fetchall()]
        current_keywords = [r["keyword"] for r in conn.execute("SELECT keyword FROM keywords").fetchall()]

    # Step 1: brainstorm fresh seeds with Claude
    prompt_path = Path(__file__).parent / "prompts" / "topic_ideas.txt"
    prompt = prompt_path.read_text(encoding="utf-8").format(
        existing_slugs="\n".join(f"- {s}" for s in existing_slugs) or "- (none)",
        current_keywords="\n".join(f"- {k}" for k in current_keywords) or "- (none)",
    )
    response_text = chat(config.writer.draft_model, prompt)
    try:
        new_seeds = parse_json(response_text)
        if not isinstance(new_seeds, list):
            new_seeds = []
    except (json.JSONDecodeError, IndexError, ValueError):
        logger.warning("Failed to parse seed brainstorm, using defaults only")
        new_seeds = []

    # Step 2: expand all seeds via Google Autocomplete
    all_seeds = list({*SEED_TERMS, *new_seeds})
    all_suggestions = expand_keywords(all_seeds)

    # Step 3: ask Claude to rank top 10
    rank_prompt = (
        "From these NZ-locale search suggestions, pick the top 10 highest-traffic "
        "keywords that are most useful to a Filipino-NZ community + NZ jobs/visa "
        "blog audience. Prioritise commercial intent and clear search demand.\n\n"
        f"Keywords:\n{json.dumps(all_suggestions[:120])}\n\n"
        'Return a JSON array of objects: [{"keyword": "...", "volume": "high|medium|low"}]\n'
        "Top 10 only. No markdown fences."
    )
    rank_text = chat(config.writer.draft_model, rank_prompt)
    try:
        top_keywords = parse_json(rank_text)
        if not isinstance(top_keywords, list):
            top_keywords = []
    except (json.JSONDecodeError, IndexError, ValueError):
        logger.error("Failed to parse keyword ranking — keeping current set")
        return current_keywords

    # Step 4: persist
    with db.connect() as conn:
        for kw in top_keywords:
            if not isinstance(kw, dict):
                continue
            keyword = kw.get("keyword", "").strip()
            if not keyword:
                continue
            volume = kw.get("volume") if kw.get("volume") in ("high", "medium", "low") else "medium"
            covered = conn.execute(
                "SELECT COUNT(*) AS n FROM topics "
                "WHERE LOWER(primary_keyword) = LOWER(?) AND status = 'published'",
                (keyword,),
            ).fetchone()["n"] > 0
            conn.execute(
                """
                INSERT INTO keywords (keyword, estimated_volume, covered, last_refreshed)
                VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                ON CONFLICT(keyword) DO UPDATE SET
                    estimated_volume = excluded.estimated_volume,
                    covered = excluded.covered,
                    last_refreshed = excluded.last_refreshed
                """,
                (keyword, volume, int(covered)),
            )

    result = [kw["keyword"] for kw in top_keywords if isinstance(kw, dict) and kw.get("keyword")]
    logger.info("Top keywords refreshed: %s", result)
    return result
