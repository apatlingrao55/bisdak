"""
discover.py — Topic discovery for bisdak.

Sources, all NZ-locale + Filipino-community focused:
  1. Keyword gap (Google Autocomplete vs already-published slugs)
  2. RSS feeds — RNZ, Newsroom, 1News, Stuff (when feed-accessible)
  3. Google News RSS — Filipino-NZ + NZ jobs/visa queries
  4. GDELT — global news geofenced to NZ
  5. Embassy/official scrapes — Philippine Embassy NZ + Immigration NZ
"""
from __future__ import annotations

import json
import logging
import random
import re
import time
from datetime import datetime
from difflib import SequenceMatcher
from urllib.parse import quote

import feedparser
import requests
from bs4 import BeautifulSoup

from . import bisdak as bisdak_db
from . import config
from . import db
from .keywords import expand_keywords
from .llm import chat, parse_json
from .slugs import slugify

logger = logging.getLogger(__name__)

_USER_AGENT = "BisDakAutoblog/1.0 (+https://bisdak.co.nz/contact)"
_HTTP_HEADERS = {"User-Agent": _USER_AGENT}
_MAX_HEADLINES_PER_LLM = 25

# ── RSS feeds (general NZ news; LLM filters for community/jobs/visa relevance) ──

NEWS_FEEDS: list[str] = [
    "https://www.rnz.co.nz/rss/pacific.xml",
    "https://www.rnz.co.nz/rss/national.xml",
    "https://www.newsroom.co.nz/feed",
    "https://www.1news.co.nz/feed",
]

# ── HTML pages to scrape (no RSS) — pull h1/h2/h3 headlines ──────────────────

SCRAPE_PAGES: list[dict[str, str]] = [
    {"name": "Immigration NZ news", "url": "https://www.immigration.govt.nz/about-us/media-centre", "type": "gov_announcement"},
    {"name": "Beehive releases", "url": "https://www.beehive.govt.nz/releases", "type": "gov_announcement"},
    {"name": "Philippine Embassy NZ", "url": "https://philembassy.org.nz/", "type": "embassy"},
    {"name": "Employment NZ news", "url": "https://www.employment.govt.nz/about/news/", "type": "gov_announcement"},
    {"name": "Stuff Pasifika", "url": "https://www.stuff.co.nz/topic/pasifika", "type": "community_news"},
]

# ── Google News RSS feeds (NZ locale) ────────────────────────────────────────

GOOGLE_NEWS_FEEDS: list[str] = [
    # Community
    "https://news.google.com/rss/search?q=filipino+community+new+zealand&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=pinoy+new+zealand&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=filipino+nz&hl=en-NZ&gl=NZ&ceid=NZ:en",
    # Jobs / visa / immigration
    "https://news.google.com/rss/search?q=new+zealand+work+visa+filipino&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=accredited+employer+work+visa&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=skilled+migrant+nz&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=immigration+new+zealand+announcement&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=filipino+caregivers+new+zealand&hl=en-NZ&gl=NZ&ceid=NZ:en",
    "https://news.google.com/rss/search?q=filipino+nurses+new+zealand&hl=en-NZ&gl=NZ&ceid=NZ:en",
]

# ── GDELT queries (NZ-geofenced) ─────────────────────────────────────────────

GDELT_QUERIES: list[str] = [
    "filipino new zealand",
    "filipino community",
    "philippines new zealand",
    "work visa new zealand",
    "skilled migrant new zealand",
]


def _sanitize_headline(text: str) -> str:
    """Strip control chars and length-cap to make prompt injection harder."""
    text = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", text)
    return text[:200].strip()


def run_discovery() -> int:
    """Run all discovery sources. Returns count of new topics added to SQLite."""
    existing_slugs = _get_existing_slugs()
    existing_titles = _get_existing_topic_titles()

    total = 0
    total += _discover_keyword_gaps(existing_slugs, existing_titles)
    total += _discover_news_scrapes(existing_slugs, existing_titles)
    total += _discover_from_headlines(
        _fetch_rss_headlines(NEWS_FEEDS), source="community_news",
        source_label="NZ media RSS",
        existing_slugs=existing_slugs, existing_titles=existing_titles,
    )
    total += _discover_from_headlines(
        _fetch_rss_headlines(GOOGLE_NEWS_FEEDS), source="google_news",
        source_label="Google News",
        existing_slugs=existing_slugs, existing_titles=existing_titles,
    )
    total += _discover_from_headlines(
        _fetch_gdelt_headlines(), source="gdelt", source_label="GDELT",
        existing_slugs=existing_slugs, existing_titles=existing_titles,
    )

    _score_and_promote_topics()
    logger.info("Discovery complete: %d new topics found.", total)
    return total


def _get_existing_slugs() -> list[str]:
    """Slugs already present in bisdak's Postgres `posts` table."""
    try:
        return list(bisdak_db.existing_slugs())
    except Exception as exc:
        logger.warning("Could not read existing slugs from Postgres: %s", exc)
        return []


def _get_existing_topic_titles() -> set[str]:
    with db.connect() as conn:
        rows = conn.execute("SELECT title FROM topics").fetchall()
    return {r["title"].lower() for r in rows}


def _is_duplicate(title: str, existing_slugs: list[str], existing_titles: set[str]) -> bool:
    title_lower = title.lower()
    if title_lower in existing_titles:
        return True
    title_slug = slugify(title)
    for slug in existing_slugs:
        if SequenceMatcher(None, title_slug, slug).ratio() > 0.75:
            return True
    title_words = set(re.sub(r"[^a-z0-9\s]", "", title_lower).split())
    for slug in existing_slugs:
        slug_words = set(slug.split("-"))
        overlap = title_words & slug_words
        if len(overlap) >= 3 and len(overlap) / max(len(title_words), len(slug_words)) > 0.6:
            return True
    return False


def _discover_keyword_gaps(existing_slugs: list[str], existing_titles: set[str]) -> int:
    logger.info("Discovering keyword gaps...")

    with db.connect() as conn:
        keywords = [
            r["keyword"]
            for r in conn.execute("SELECT keyword FROM keywords WHERE covered = 0").fetchall()
        ]

    if not keywords:
        # Reasonable defaults if `keywords` refresh hasn't run yet.
        keywords = [
            "filipino business nz",
            "filipino restaurant nz",
            "work visa new zealand filipino",
            "skilled migrant new zealand",
        ]

    suggestions = expand_keywords(keywords[:10])
    new_topics: list[tuple[str, str]] = []

    for suggestion in suggestions[: config.discovery.max_topics_per_run]:
        title = suggestion.strip().title()
        if not title:
            continue
        if _is_duplicate(title, existing_slugs, existing_titles):
            continue
        new_topics.append((title, suggestion.lower()))
        existing_titles.add(title.lower())

    if new_topics:
        with db.connect() as conn:
            conn.executemany(
                "INSERT INTO topics (title, source, primary_keyword, score) "
                "VALUES (?, 'keyword_gap', ?, 0)",
                new_topics,
            )

    logger.info("Keyword gap discovery: %d new topics.", len(new_topics))
    return len(new_topics)


def _discover_news_scrapes(existing_slugs: list[str], existing_titles: set[str]) -> int:
    """Scrape h1/h2/h3 headlines from gov + embassy + community pages."""
    logger.info("Discovering from news scrapes...")
    new_topics: list[tuple[str, str, str]] = []

    for source in SCRAPE_PAGES:
        try:
            resp = requests.get(source["url"], timeout=15, headers=_HTTP_HEADERS)
            if resp.status_code != 200:
                logger.warning("Failed %s: HTTP %d", source["name"], resp.status_code)
                continue
            soup = BeautifulSoup(resp.text, "lxml")
            headlines = _extract_headlines(soup)
            if not headlines:
                continue

            safe_headlines = [_sanitize_headline(h) for h in headlines[:15]]
            prompt = (
                f"These are recent headlines from {source['name']} "
                f"({source['type']}, NZ-focused):\n\n"
                + "\n".join(f"- {h}" for h in safe_headlines)
                + "\n\nWhich would inspire a blog post relevant to (a) Filipinos "
                "living in NZ or (b) Filipinos applying for NZ jobs/visas? "
                "For each, suggest a blog post title.\n\n"
                'Return a JSON array of objects: [{"headline": "...", "blog_title": "...", "reason": "..."}]\n'
                "Only include genuinely relevant headlines. Empty array [] if none apply.\n"
                "No markdown fences."
            )
            response_text = chat(config.writer.draft_model, prompt)
            try:
                ideas = parse_json(response_text)
            except (json.JSONDecodeError, ValueError):
                logger.warning("Failed to parse ideas for %s", source["name"])
                continue
            if not isinstance(ideas, list):
                continue

            for idea in ideas:
                if not isinstance(idea, dict):
                    continue
                title = idea.get("blog_title", "").strip()
                if not title or _is_duplicate(title, existing_slugs, existing_titles):
                    continue
                new_topics.append((title, source["type"], source["url"]))
                existing_titles.add(title.lower())

            time.sleep(random.uniform(config.discovery.min_delay, config.discovery.max_delay))
        except Exception as exc:
            logger.warning("Failed to scrape %s: %s", source["name"], exc)

    if new_topics:
        with db.connect() as conn:
            conn.executemany(
                "INSERT INTO topics (title, source, source_url, score) "
                "VALUES (?, ?, ?, 0)",
                new_topics,
            )

    logger.info("News scrape discovery: %d new topics.", len(new_topics))
    return len(new_topics)


def _fetch_rss_headlines(feed_urls: list[str]) -> list[dict[str, str]]:
    """Pull recent headlines from RSS feeds, deduped, capped at 25."""
    out: list[dict[str, str]] = []
    for feed_url in feed_urls:
        if len(out) >= _MAX_HEADLINES_PER_LLM:
            break
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:
                title = entry.get("title", "").strip()
                link = entry.get("link", "")
                title = re.sub(r"\s*-\s*[^-]+$", "", title).strip()
                if title and len(title) > 20:
                    out.append({"title": title, "url": link})
            time.sleep(random.uniform(1, 2))
        except Exception as exc:
            logger.warning("RSS parse failed for %s: %s", feed_url, exc)
    return out


def _fetch_gdelt_headlines() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for query in GDELT_QUERIES:
        if len(out) >= _MAX_HEADLINES_PER_LLM:
            break
        encoded = quote(query) + "+sourcelang:eng+sourcecountry:NZ"
        url = (
            f"https://api.gdeltproject.org/api/v2/doc/doc"
            f"?query={encoded}&mode=artlist&format=json&maxrecords=20&sort=DateDesc"
        )
        try:
            resp = requests.get(url, timeout=15, headers=_HTTP_HEADERS)
            if resp.status_code != 200:
                continue
            data = resp.json()
            for article in data.get("articles", []):
                title = article.get("title", "").strip()
                link = article.get("url", "")
                if title and len(title) > 20:
                    out.append({"title": title, "url": link})
            time.sleep(random.uniform(1, 2))
        except Exception as exc:
            logger.warning("GDELT query failed for %r: %s", query, exc)
    return out


def _discover_from_headlines(
    raw_headlines: list[dict[str, str]],
    source: str,
    source_label: str,
    existing_slugs: list[str],
    existing_titles: set[str],
) -> int:
    if not raw_headlines:
        return 0

    unique = list({h["title"].lower(): h for h in raw_headlines}.values())
    safe_titles = [_sanitize_headline(h["title"]) for h in unique[:_MAX_HEADLINES_PER_LLM]]
    headline_list = "\n".join(f"- {t}" for t in safe_titles)

    prompt = (
        f"These are recent headlines from {source_label} (NZ-focused):\n\n"
        f"{headline_list}\n\n"
        "Which would inspire a blog post relevant to:\n"
        "  (a) Filipinos living in New Zealand (community, lifestyle, business spotlights), or\n"
        "  (b) Filipinos applying for NZ jobs/visas (work pathways, sector demand, INZ rulings)?\n\n"
        'Return a JSON array of objects: [{"headline": "...", "blog_title": "...", "reason": "..."}]\n'
        "Only include genuinely relevant headlines. Empty array [] if none apply.\n"
        "No markdown fences."
    )

    try:
        response_text = chat(config.writer.draft_model, prompt)
        ideas = parse_json(response_text)
    except Exception as exc:
        logger.warning("Failed to parse %s ideas: %s", source_label, exc)
        return 0

    if not isinstance(ideas, list):
        return 0

    url_by_title = {h["title"].lower(): h["url"] for h in unique}

    new_topics: list[tuple[str, str, str]] = []
    for idea in ideas:
        if not isinstance(idea, dict):
            continue
        title = idea.get("blog_title", "").strip()
        if not title or _is_duplicate(title, existing_slugs, existing_titles):
            continue

        source_url = ""
        headline = idea.get("headline", "").lower()
        if headline in url_by_title:
            source_url = url_by_title[headline]
        else:
            best_ratio = 0.0
            for h_title, h_url in url_by_title.items():
                ratio = SequenceMatcher(None, headline, h_title).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    source_url = h_url
            if best_ratio < 0.5:
                source_url = ""

        new_topics.append((title, source, source_url))
        existing_titles.add(title.lower())

    if new_topics:
        with db.connect() as conn:
            conn.executemany(
                "INSERT INTO topics (title, source, source_url, score) "
                "VALUES (?, ?, ?, 0)",
                new_topics,
            )

    logger.info("%s discovery: %d new topics.", source_label, len(new_topics))
    return len(new_topics)


def _extract_headlines(soup: BeautifulSoup) -> list[str]:
    headlines: list[str] = []
    for tag in soup.find_all(["h1", "h2", "h3"]):
        text = tag.get_text(strip=True)
        if 20 < len(text) < 200:
            headlines.append(text)
    return list(dict.fromkeys(headlines))[:30]


def _score_and_promote_topics() -> None:
    """Score discovered topics; promote those at or above min_score to 'queued'."""
    with db.connect() as conn:
        topics = conn.execute(
            "SELECT id, title, source, primary_keyword FROM topics "
            "WHERE status = 'discovered'"
        ).fetchall()

        uncovered_keywords = {
            r["keyword"].lower()
            for r in conn.execute("SELECT keyword FROM keywords WHERE covered = 0").fetchall()
        }

        # Source quality weights — tuned for bisdak's content domain.
        source_scores = {
            "seed_brainstorm": 15,
            "google_news": 30,
            "community_news": 30,
            "regulatory": 38,
            "gov_announcement": 40,    # INZ / Beehive press = most timely
            "embassy": 35,             # PHL embassy NZ
            "jobs_news": 32,
            "competitor": 22,
            "keyword_gap": 28,
            "gdelt": 20,
        }

        # High-value terms — anything in the title that earns a small boost.
        high_value_terms = (
            "filipino", "pinoy", "nz", "new zealand", "auckland", "wellington",
            "christchurch", "visa", "immigration", "work permit", "ofw",
            "skilled migrant", "aewv", "philippine",
        )

        for topic in topics:
            title_lower = topic["title"].lower()
            score = source_scores.get(topic["source"], 10)

            # Uncovered-keyword bonus
            pk = (topic["primary_keyword"] or "").lower()
            if pk and pk in uncovered_keywords:
                score += 25

            # High-value-term bonus
            for term in high_value_terms:
                if term in title_lower:
                    score += 4

            # Seasonal — NZ employment cycle (no winter-property pattern needed here)
            month = datetime.now().month
            if month in (10, 11, 12):  # Oct-Dec — pre-Christmas hiring & remittance peak
                for term in ("balikbayan", "christmas", "remittance", "send money"):
                    if term in title_lower:
                        score += 8
                        break
            if month in (1, 2):  # Jan-Feb — new school year, OFW family travel
                for term in ("school", "study", "post study", "student visa"):
                    if term in title_lower:
                        score += 8
                        break

            conn.execute(
                "UPDATE topics SET score = ? WHERE id = ?",
                (score, topic["id"]),
            )

        conn.execute(
            "UPDATE topics SET status = 'queued' "
            "WHERE status = 'discovered' AND score >= ?",
            (config.discovery.min_score,),
        )
        queued = conn.execute(
            "SELECT COUNT(*) AS n FROM topics WHERE status = 'queued'"
        ).fetchone()["n"]
        logger.info("Scored %d topics, %d now queued.", len(topics), queued)
