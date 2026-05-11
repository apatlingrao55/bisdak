"""
slugs.py — Clean kebab-case slug generation.

No timestamp suffix (unlike bisdak's lib/slugify.ts which appends Date.now()).
Autoblog produces evergreen content — a clean, readable slug matters for SEO.
Collision retry is the publisher's job (suffix `-2`, `-3`, …).
"""
from __future__ import annotations

import re

_SLUG_RE = re.compile(r"[^a-z0-9]+")
_MAX_LEN_DEFAULT = 80

# bisdak top-level URL segments — autoblog must never produce a slug that would
# collide with a real route. Kept here (not in publisher.py) so it's easy to
# grep when adding new routes to bisdak.
RESERVED_SLUGS: frozenset[str] = frozenset({
    "admin", "api", "auth", "blog", "business", "businesses",
    "cookies", "dashboard", "disclaimer", "jobs", "privacy",
    "search", "sitemap", "submit", "terms", "tools", "robots",
    "favicon", "_next", "_static",
})


def slugify(title: str, max_len: int = _MAX_LEN_DEFAULT) -> str:
    """Convert a title to a clean kebab-case slug. No timestamp suffix.

    - Lowercase, ASCII letters/digits/hyphens only
    - Consecutive non-alphanum characters collapse to a single dash
    - Leading/trailing dashes stripped
    - Truncated at the last word boundary within max_len when possible
    """
    s = _SLUG_RE.sub("-", title.lower()).strip("-")
    if len(s) <= max_len:
        return s
    cut = s.rfind("-", 0, max_len)
    return (s[:cut] if cut > 20 else s[:max_len]).strip("-")


class QuarantineTopic(Exception):
    """Raised by the publisher when a topic cannot be published — caller
    moves the topic to the 'quarantined' status."""


def is_reserved(slug: str) -> bool:
    """True if the slug collides with a bisdak top-level route."""
    return slug in RESERVED_SLUGS or slug.startswith(tuple(f"{r}-" for r in RESERVED_SLUGS))
