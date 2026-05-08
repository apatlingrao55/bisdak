"""
BisDak contact enrichment script.

For each business missing website/phone/email:
  1. DDG search "{name}" New Zealand
  2. Take first organic non-directory result → website
  3. Scrape website + /contact page for email and phone
  4. Update businesses table

Usage:
  python3 enrich.py            # enrich all missing
  python3 enrich.py --test 10  # dry run on first 10
"""
import argparse
import logging
import os
import re
import sys
import time
import random
from typing import Optional
from urllib.parse import urlparse, parse_qs, unquote, urljoin

import psycopg2
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("enrich")

# ── constants ──────────────────────────────────────────────────────────────

DDG_URL = "https://html.duckduckgo.com/html/"
DDG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8",
    "Cookie": "kl=nz-en; p=-2",
}

SKIP_DOMAINS = {
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
    "youtube.com", "tiktok.com", "google.com", "google.co.nz",
    "yelp.com", "tripadvisor.com", "zomato.com",
    "finda.co.nz", "yellow.co.nz", "yellowpages.co.nz",
    "findglocal.com", "foursquare.com", "mapquest.com", "cylex.co.nz",
    "businessph.co.nz", "pinoys.co.nz", "nzwao.com", "nzpbc.com",
    "companies.govt.nz", "business.govt.nz",
    "wikipedia.org", "stuff.co.nz", "nzherald.co.nz",
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
SKIP_EMAIL_PREFIXES = {"noreply", "no-reply", "donotreply", "webmaster", "postmaster",
                       "support", "help", "sales", "test", "example"}

# NZ phone: landline 09/04/03/07/06 + mobile 02x
NZ_PHONE_RE = re.compile(
    r"\b(?:"
    r"(?:\+64|0064)[\s\-]?[2-9]\d{1,2}[\s\-]?\d{3}[\s\-]?\d{3,4}"  # +64 ...
    r"|0[2-9]\d?[\s\-]?\d{3}[\s\-]?\d{3,4}"                          # 0X... NZ local
    r")\b"
)


# ── DB ─────────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fetch_businesses(conn, limit: Optional[int] = None):
    """Return businesses missing any contact field."""
    sql = """
        SELECT id, name FROM businesses
        WHERE status = 'active'
          AND (website IS NULL OR phone IS NULL OR email IS NULL)
        ORDER BY name
    """
    if limit:
        sql += f" LIMIT {limit}"
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


def update_business(conn, biz_id: str, website=None, email=None, phone=None):
    parts = []
    values = []
    if website:
        parts.append("website = COALESCE(website, %s)")
        values.append(website)
    if phone:
        parts.append("phone = COALESCE(phone, %s)")
        values.append(phone)
    if email:
        parts.append("email = COALESCE(email, %s)")
        values.append(email)
    if not parts:
        return
    values.append(biz_id)
    with conn.cursor() as cur:
        cur.execute(f"UPDATE businesses SET {', '.join(parts)} WHERE id = %s", values)
    conn.commit()


# ── DDG search ─────────────────────────────────────────────────────────────

def ddg_first_url(name: str) -> Optional[str]:
    query = f'"{name}" New Zealand'
    try:
        resp = requests.get(
            DDG_URL,
            params={"q": query, "kl": "nz-en"},
            headers=DDG_HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.warning("DDG request failed for %s: %s", name, e)
        return None

    soup = BeautifulSoup(resp.text, "lxml")
    for card in soup.select("div.result.web-result"):
        link = card.select_one(".result__a")
        if not link:
            continue
        raw = link.get("href", "")
        qs = parse_qs(urlparse("https:" + raw).query)
        url = unquote(qs.get("uddg", [""])[0])
        if url and _is_business_url(url):
            return url
    return None


def _is_business_url(url: str) -> bool:
    try:
        domain = urlparse(url).netloc.lower().lstrip("www.")
        return not any(skip in domain for skip in SKIP_DOMAINS)
    except Exception:
        return False


# ── website scraping ───────────────────────────────────────────────────────

_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
})


def scrape_contacts(url: str) -> dict:
    """Fetch url (and /contact if needed). Return {email, phone}."""
    result = {}
    pages = [url]
    try:
        base = "{u.scheme}://{u.netloc}".format(u=urlparse(url))
        pages.append(urljoin(base, "/contact"))
        pages.append(urljoin(base, "/contact-us"))
    except Exception:
        pass

    for page in pages:
        try:
            resp = _session.get(page, timeout=10, allow_redirects=True)
            if resp.status_code != 200:
                continue
            html = resp.text
            domain = urlparse(page).netloc.lstrip("www.")

            if not result.get("email"):
                result["email"] = _extract_email(html, domain)
            if not result.get("phone"):
                result["phone"] = _extract_phone(html)

            if result.get("email") and result.get("phone"):
                break

            time.sleep(random.uniform(1.5, 3.0))
        except Exception as e:
            logger.debug("scrape error %s: %s", page, e)

    return result


def _extract_email(html: str, domain: str) -> Optional[str]:
    soup = BeautifulSoup(html, "lxml")
    found = []

    # mailto: links first (most reliable)
    for a in soup.find_all("a", href=re.compile(r"^mailto:", re.I)):
        email = a["href"][7:].split("?")[0].strip().lower()
        if _valid_email(email):
            found.append(email)

    # regex fallback
    if not found:
        for email in EMAIL_RE.findall(html):
            if _valid_email(email.lower()):
                found.append(email.lower())

    # prefer emails matching the business domain
    found = list(dict.fromkeys(found))  # dedup, preserve order
    domain_emails = [e for e in found if domain in e]
    return (domain_emails or found or [None])[0]


def _valid_email(email: str) -> bool:
    if not EMAIL_RE.match(email):
        return False
    prefix = email.split("@")[0]
    if prefix in SKIP_EMAIL_PREFIXES:
        return False
    if email.endswith((".png", ".jpg", ".gif", ".svg")):
        return False
    return True


def _extract_phone(html: str) -> Optional[str]:
    # tel: links first
    soup = BeautifulSoup(html, "lxml")
    for a in soup.find_all("a", href=re.compile(r"^tel:", re.I)):
        raw = a["href"][4:].strip()
        cleaned = re.sub(r"[\s\-\(\)]", "", raw)
        if len(cleaned) >= 9:
            return raw

    # regex in plain text
    text = soup.get_text(" ")
    matches = NZ_PHONE_RE.findall(text)
    if matches:
        return matches[0].strip()
    return None


# ── main ───────────────────────────────────────────────────────────────────

def run(test_limit: Optional[int] = None):
    conn = get_conn()
    businesses = fetch_businesses(conn, limit=test_limit)
    total = len(businesses)
    logger.info("found %d businesses to enrich", total)

    updated = 0
    for i, (biz_id, name) in enumerate(businesses, 1):
        logger.info("[%d/%d] %s", i, total, name)

        # Step 1: DDG search
        time.sleep(random.uniform(4.0, 8.0))
        website = ddg_first_url(name)
        if not website:
            logger.debug("  no DDG result")
            continue

        logger.info("  → %s", website)

        # Step 2: scrape the website for email + phone
        time.sleep(random.uniform(2.0, 4.0))
        contacts = scrape_contacts(website)

        update_business(
            conn,
            biz_id,
            website=website,
            email=contacts.get("email"),
            phone=contacts.get("phone"),
        )

        found = [k for k, v in {"website": website, **contacts}.items() if v]
        logger.info("  found: %s", ", ".join(found) if found else "nothing")
        if found:
            updated += 1

    conn.close()
    print(f"\n--- Enrichment Summary ---")
    print(f"processed: {total}")
    print(f"updated:   {updated}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich BisDak business contact data")
    parser.add_argument("--test", type=int, metavar="N", help="Only process first N businesses")
    args = parser.parse_args()
    run(test_limit=args.test)
