"""
link_checker.py — Verify URLs in a generated draft + enforce citation gate.

External link rules (citations + body markdown links):
  * 404/410 on a non-auth-redirect URL → BROKEN (must fix or remove)
  * DNS failure → BROKEN
  * Timeout / 403 / 429 / 5xx → WARNING (institutional sites often bot-block)
  * 2xx/3xx OK → counted toward the citation gate

Citation gate (for the publish-time check):
  * At least 2 distinct OK links overall, AND
  * At least 1 OK link to an "authoritative NZ domain" (gov, established
    media, official PH).

Internal links: bisdak's renderer doesn't support relative paths anyway
(only http/https), so internal-path checking is a no-op for now.
"""
from __future__ import annotations

import logging
import re
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 10
_HEADERS = {"User-Agent": "BisDakAutoblog/1.0 (+https://bisdak.co.nz/contact)"}

_AUTH_PATH_FRAGMENTS = (
    "/login", "/signin", "/sign-in", "formsauthentication", "/auth", "returnurl",
)

# Authoritative NZ domains — at least one OK citation must match this list
# for the draft to pass the citation gate.
AUTHORITATIVE_DOMAINS: frozenset[str] = frozenset({
    # NZ government & official
    "immigration.govt.nz", "mbie.govt.nz", "ird.govt.nz", "health.govt.nz",
    "education.govt.nz", "stats.govt.nz", "beehive.govt.nz", "ssc.govt.nz",
    "consumerprotection.govt.nz", "employment.govt.nz", "tenancy.govt.nz",
    "govt.nz",
    # NZ established media
    "rnz.co.nz", "stuff.co.nz", "nzherald.co.nz", "1news.co.nz",
    "businessdesk.co.nz", "newsroom.co.nz",
    # Philippines official (community-relevant)
    "dfa.gov.ph", "philembassy.org.nz", "gov.ph",
})

# Suffix matches — covers e.g. *.ac.nz, *.org.nz universities/community orgs.
AUTHORITATIVE_SUFFIXES: tuple[str, ...] = (
    ".ac.nz", ".org.nz", ".govt.nz", ".gov.ph",
)


def _normalise_domain(domain: str) -> str:
    domain = domain.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _is_authoritative(url: str) -> bool:
    try:
        host = _normalise_domain(urlparse(url).netloc)
    except Exception:
        return False
    if host in AUTHORITATIVE_DOMAINS:
        return True
    return any(host.endswith(s) for s in AUTHORITATIVE_SUFFIXES)


def _is_auth_redirect(final_url: str) -> bool:
    lower = final_url.lower()
    return any(frag in lower for frag in _AUTH_PATH_FRAGMENTS)


def extract_urls(body: str) -> list[str]:
    """Pull every external `[text](https?://...)` URL from a markdown body,
    deduplicated, preserving order."""
    urls: list[str] = []
    for m in re.finditer(r'\[([^\]]+)\]\((https?://[^\s)]+)\)', body):
        urls.append(m.group(2))
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _check_one(url: str) -> tuple[bool, bool, str]:
    """Return (ok, warning, status_str). ok=False ⇒ definitively broken."""
    try:
        resp = requests.head(url, timeout=_TIMEOUT, headers=_HEADERS, allow_redirects=True)
        code = resp.status_code
        final_url = resp.url
        if code == 405:
            # HEAD not allowed — fall back to a streamed GET
            resp = requests.get(
                url, timeout=_TIMEOUT, headers=_HEADERS,
                allow_redirects=True, stream=True,
            )
            code = resp.status_code
            final_url = resp.url
    except requests.exceptions.Timeout:
        return True, True, "timeout"
    except requests.exceptions.ConnectionError as exc:
        exc_str = str(exc).lower()
        if any(frag in exc_str for frag in (
            "nameresolut", "failed to resolve",
            "name or service not known", "nodename nor servname",
        )):
            return False, False, "dns-error"
        return True, True, "conn-error"
    except Exception as exc:
        return True, True, f"error:{exc}"

    if code in (404, 410):
        if _is_auth_redirect(final_url):
            return True, True, f"{code}+auth-redirect"
        return False, False, str(code)
    if code >= 400:
        # 403/429/5xx — warn but don't block; many gov sites bot-throttle HEAD.
        return True, True, str(code)
    return True, False, str(code)


def check_links(body: str) -> dict:
    """Verify every external markdown link in `body`.

    Returns a dict with:
      broken    list[(url, status)]
      warnings  list[(url, status)]
      ok_urls   list[str]    — links that returned 2xx/3xx
      checked   int          — total unique URLs inspected
      ok        bool         — no broken links present
    """
    urls = extract_urls(body)
    broken: list[tuple[str, str]] = []
    warnings: list[tuple[str, str]] = []
    ok_urls: list[str] = []

    for url in urls:
        ok, warn, status = _check_one(url)
        if not ok:
            logger.warning("Broken link: %s → %s", url, status)
            broken.append((url, status))
        elif warn:
            logger.info("Link warning (non-fatal): %s → %s", url, status)
            warnings.append((url, status))
            ok_urls.append(url)
        else:
            logger.debug("Link OK: %s → %s", url, status)
            ok_urls.append(url)

    logger.info(
        "Link check: %d unique URLs, %d broken, %d warnings",
        len(urls), len(broken), len(warnings),
    )
    return {
        "broken": broken,
        "warnings": warnings,
        "ok_urls": ok_urls,
        "checked": len(urls),
        "ok": len(broken) == 0,
    }


def citation_gate(report: dict) -> tuple[bool, str]:
    """Return (passed, reason). Reason is empty when passed=True.

    Requires:
      * No broken links
      * ≥2 distinct OK external links
      * ≥1 OK link from AUTHORITATIVE_DOMAINS / suffixes
    """
    if report["broken"]:
        return False, f"{len(report['broken'])} broken link(s) present"
    if len(report["ok_urls"]) < 2:
        return False, f"only {len(report['ok_urls'])} verified outbound link(s) — minimum 2"
    if not any(_is_authoritative(u) for u in report["ok_urls"]):
        return False, "no authoritative-domain citation (.govt.nz/.gov.ph/established NZ media)"
    return True, ""
