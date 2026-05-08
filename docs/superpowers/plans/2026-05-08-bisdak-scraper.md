# BisDak Business Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Python script that scrapes Filipino business listings from NoCowboys, Finda, and pinoys.co.nz and inserts them as pending submissions into the BisDak Supabase database.

**Architecture:** Three source scrapers share a common `BaseScraper` (ported from InspectPro). A keyword categorizer maps business names to BisDak's 8 category slugs. A `db.py` module connects to Supabase, deduplicates by name, and inserts into the `submissions` table. `run.py` orchestrates everything and prints a summary.

**Tech Stack:** Python 3.11+, requests, BeautifulSoup4 (lxml), psycopg2-binary, python-dotenv

---

## File Map

| File | Responsibility |
|---|---|
| `scripts/scrape-bisdak/base.py` | BaseScraper ABC with retry, rate-limit, robots.txt, ScrapedBiz TypedDict |
| `scripts/scrape-bisdak/categorizer.py` | Keyword → category slug lookup |
| `scripts/scrape-bisdak/regions.py` | Location text → BisDak region slug |
| `scripts/scrape-bisdak/db.py` | Supabase connection, dedup check, insert into submissions |
| `scripts/scrape-bisdak/scrapers/nocowboys.py` | NoCowboys.co.nz scraper |
| `scripts/scrape-bisdak/scrapers/finda.py` | Finda.co.nz scraper |
| `scripts/scrape-bisdak/scrapers/pinoysnz.py` | pinoys.co.nz scraper |
| `scripts/scrape-bisdak/run.py` | Entry point: run all scrapers → pipeline → summary |
| `scripts/scrape-bisdak/requirements.txt` | Python dependencies |
| `scripts/scrape-bisdak/.env.example` | DATABASE_URL template |
| `scripts/scrape-bisdak/tests/test_categorizer.py` | Unit tests for categorizer |
| `scripts/scrape-bisdak/tests/test_regions.py` | Unit tests for region mapper |
| `scripts/scrape-bisdak/tests/test_db.py` | Unit tests for slug generation + dedup logic |

---

## Task 1: Scaffold the package

**Files:**
- Create: `scripts/scrape-bisdak/requirements.txt`
- Create: `scripts/scrape-bisdak/.env.example`
- Create: `scripts/scrape-bisdak/scrapers/__init__.py`
- Create: `scripts/scrape-bisdak/tests/__init__.py`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak/scrapers
mkdir -p /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak/tests
touch /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak/scrapers/__init__.py
touch /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak/tests/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

`scripts/scrape-bisdak/requirements.txt`:
```
requests==2.32.3
beautifulsoup4==4.12.3
lxml==5.2.2
psycopg2-binary==2.9.9
python-dotenv==1.0.1
```

- [ ] **Step 3: Write .env.example**

`scripts/scrape-bisdak/.env.example`:
```
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres
```

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 5: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/
git commit -m "chore(scraper): scaffold scrape-bisdak package structure"
```

---

## Task 2: Base scraper + ScrapedBiz type

**Files:**
- Create: `scripts/scrape-bisdak/base.py`

- [ ] **Step 1: Write base.py**

`scripts/scrape-bisdak/base.py`:
```python
import logging
import random
import time
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import TypedDict

import requests
from bs4 import BeautifulSoup
from urllib.robotparser import RobotFileParser

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
]


class ScrapedBiz(TypedDict):
    business_name: str
    description: str | None
    phone: str | None
    website: str | None
    facebook_url: str | None
    region_text: str | None
    source_name: str
    source_url: str


@lru_cache(maxsize=64)
def _robots_can_fetch(domain: str, path: str) -> bool:
    rp = RobotFileParser()
    rp.set_url(f"https://{domain}/robots.txt")
    try:
        rp.read()
    except Exception:
        return True
    return rp.can_fetch("*", path)


class BaseScraper(ABC):
    MIN_DELAY = 4.0
    MAX_DELAY = 9.0
    MIN_EXPECTED = 5
    SOURCE_NAME: str = ""

    def __init__(self) -> None:
        self.session = requests.Session()
        self._rotate_agent()

    def _rotate_agent(self) -> None:
        self.session.headers.update({
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "en-NZ,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
            "Referer": "https://www.google.co.nz/",
        })

    def get(self, url: str, max_retries: int = 3) -> requests.Response:
        self._rotate_agent()
        time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))
        for attempt in range(max_retries):
            try:
                resp = self.session.get(url, timeout=20)
                resp.raise_for_status()
                return resp
            except requests.RequestException as e:
                is_rate_limited = (
                    isinstance(e, requests.HTTPError)
                    and e.response is not None
                    and e.response.status_code in (429, 503)
                )
                if (is_rate_limited or isinstance(e, requests.Timeout)) and attempt < max_retries - 1:
                    wait = (2 ** attempt) + random.uniform(1, 3)
                    logger.warning("Retry %d/%d for %s (%.1fs): %s", attempt + 1, max_retries, url, wait, e)
                    time.sleep(wait)
                    continue
                raise
        raise RuntimeError(f"Failed after {max_retries} attempts: {url}")

    def soup(self, url: str) -> BeautifulSoup:
        resp = self.get(url)
        return BeautifulSoup(resp.text, "lxml")

    def scrape(self) -> list[ScrapedBiz]:
        results = list(self._scrape())
        if len(results) < self.MIN_EXPECTED:
            logger.error(
                "YIELD_LOW: %s returned %d (expected >=%d) — selector drift?",
                self.__class__.__name__, len(results), self.MIN_EXPECTED,
            )
        else:
            logger.info("%s: scraped %d", self.__class__.__name__, len(results))
        return results

    @abstractmethod
    def _scrape(self) -> list[ScrapedBiz]:
        ...
```

- [ ] **Step 2: Verify import works**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -c "from base import BaseScraper, ScrapedBiz; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/base.py
git commit -m "feat(scraper): add BaseScraper and ScrapedBiz type"
```

---

## Task 3: Categorizer

**Files:**
- Create: `scripts/scrape-bisdak/categorizer.py`
- Create: `scripts/scrape-bisdak/tests/test_categorizer.py`

- [ ] **Step 1: Write failing tests**

`scripts/scrape-bisdak/tests/test_categorizer.py`:
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from categorizer import categorize

def test_food_dining():
    assert categorize("Aling Rosa Catering", None) == "food-dining"

def test_beauty():
    assert categorize("Maria's Nails and Spa", None) == "beauty-personal-care"

def test_remittance():
    assert categorize("Pinoy Padala Services", None) == "remittance-travel"

def test_retail():
    assert categorize("Pinoy Grocery Store", None) == "retail-groceries"

def test_trades():
    assert categorize("Filipino Cleaning Services Auckland", None) == "trades-home-services"

def test_health():
    assert categorize("Pinoy Dental Clinic", None) == "health-wellness"

def test_community():
    assert categorize("Auckland Filipino Community Church", None) == "community-events"

def test_professional_services():
    assert categorize("Pinoy Tax Accountant", None) == "professional-services"

def test_fallback_to_professional_services():
    assert categorize("Agila Enterprises", None) == "professional-services"

def test_description_used_when_name_sparse():
    assert categorize("AP Enterprises", "Filipino restaurant and catering") == "food-dining"

def test_case_insensitive():
    assert categorize("LECHON KING NZ", None) == "food-dining"
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/test_categorizer.py -v
```

Expected: `ModuleNotFoundError: No module named 'categorizer'`

- [ ] **Step 3: Write categorizer.py**

`scripts/scrape-bisdak/categorizer.py`:
```python
CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("food-dining", [
        "food", "catering", "restaurant", "lechon", "bakery", "cafe", "kain",
        "lutong", "kusina", "karinderya", "bbq", "grill", "dining", "eatery",
        "kainan", "carinderia",
    ]),
    ("beauty-personal-care", [
        "salon", "nails", "beauty", "spa", "hair", "barber", "lash",
        "wax", "brow", "makeup", "grooming",
    ]),
    ("remittance-travel", [
        "remittance", "padala", "travel", "forex", "visa", "money transfer",
        "balikbayan", "money", "foreign exchange",
    ]),
    ("retail-groceries", [
        "grocery", "store", "shop", "tiangge", "retail", "market",
        "sari-sari", "supermarket",
    ]),
    ("trades-home-services", [
        "plumber", "electrician", "builder", "cleaning", "painter",
        "carpenter", "renovation", "handyman", "trades", "roofing",
        "landscaping", "fencing", "maintenance",
    ]),
    ("health-wellness", [
        "nurse", "dental", "physio", "medical", "health", "clinic",
        "therapy", "care", "aged care", "physiotherapy", "doctor",
    ]),
    ("community-events", [
        "church", "community", "events", "association", "org", "fiesta",
        "festival", "cultural", "ministry", "fellowship",
    ]),
    ("professional-services", [
        "accountant", "lawyer", "bookkeeper", "consultant", "insurance",
        "notary", "tax", "mortgage", "finance", "legal", "solicitor",
        "immigration", "advisory",
    ]),
]


def categorize(name: str, description: str | None) -> str:
    text = (name + " " + (description or "")).lower()
    for slug, keywords in CATEGORY_KEYWORDS:
        if any(kw in text for kw in keywords):
            return slug
    return "professional-services"
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/test_categorizer.py -v
```

Expected: all 11 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/categorizer.py scripts/scrape-bisdak/tests/test_categorizer.py
git commit -m "feat(scraper): add keyword categorizer with tests"
```

---

## Task 4: Region mapper

**Files:**
- Create: `scripts/scrape-bisdak/regions.py`
- Create: `scripts/scrape-bisdak/tests/test_regions.py`

- [ ] **Step 1: Write failing tests**

`scripts/scrape-bisdak/tests/test_regions.py`:
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from regions import map_region

def test_auckland():
    assert map_region("Otahuhu, Auckland") == "auckland"

def test_auckland_suburb():
    assert map_region("Manukau") == "auckland"

def test_wellington():
    assert map_region("Lower Hutt, Wellington") == "wellington"

def test_christchurch():
    assert map_region("Christchurch") == "canterbury"

def test_hamilton():
    assert map_region("Hamilton, Waikato") == "waikato"

def test_tauranga():
    assert map_region("Tauranga") == "bay-of-plenty"

def test_rotorua():
    assert map_region("Rotorua") == "bay-of-plenty"

def test_unknown_returns_none():
    assert map_region("Invercargill") is None

def test_none_input_returns_none():
    assert map_region(None) is None

def test_case_insensitive():
    assert map_region("AUCKLAND CBD") == "auckland"
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/test_regions.py -v
```

Expected: `ModuleNotFoundError: No module named 'regions'`

- [ ] **Step 3: Write regions.py**

`scripts/scrape-bisdak/regions.py`:
```python
REGION_MAP: list[tuple[str, list[str]]] = [
    ("auckland", [
        "auckland", "manukau", "waitakere", "north shore", "henderson",
        "otahuhu", "papakura", "pukekohe", "botany", "howick", "albany",
        "takapuna", "newmarket", "mt eden", "mount eden", "ponsonby",
        "glen innes", "east tamaki", "flat bush",
    ]),
    ("wellington", [
        "wellington", "lower hutt", "upper hutt", "porirua", "kapiti",
        "paraparaumu", "petone", "hutt valley",
    ]),
    ("canterbury", [
        "christchurch", "canterbury", "selwyn", "waimakariri",
        "rangiora", "rolleston",
    ]),
    ("waikato", [
        "hamilton", "waikato", "cambridge", "te awamutu", "te kauwhata",
    ]),
    ("bay-of-plenty", [
        "tauranga", "bay of plenty", "rotorua", "whakatane", "mount maunganui",
        "papamoa", "katikati",
    ]),
]


def map_region(location_text: str | None) -> str | None:
    if not location_text:
        return None
    text = location_text.lower()
    for slug, keywords in REGION_MAP:
        if any(kw in text for kw in keywords):
            return slug
    return None
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/test_regions.py -v
```

Expected: all 10 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/regions.py scripts/scrape-bisdak/tests/test_regions.py
git commit -m "feat(scraper): add region mapper with tests"
```

---

## Task 5: DB module

**Files:**
- Create: `scripts/scrape-bisdak/db.py`
- Create: `scripts/scrape-bisdak/tests/test_db.py`

- [ ] **Step 1: Write failing tests (slug generation only — no live DB)**

`scripts/scrape-bisdak/tests/test_db.py`:
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import slugify, make_unique_slug

def test_slugify_basic():
    assert slugify("Aling Rosa Catering") == "aling-rosa-catering"

def test_slugify_special_chars():
    assert slugify("Pinoy's Grill & BBQ!") == "pinoys-grill-bbq"

def test_slugify_multiple_spaces():
    assert slugify("  Hello   World  ") == "hello-world"

def test_make_unique_slug_no_conflict():
    existing = set()
    assert make_unique_slug("aling-rosa-catering", existing) == "aling-rosa-catering"

def test_make_unique_slug_conflict():
    existing = {"aling-rosa-catering"}
    assert make_unique_slug("aling-rosa-catering", existing) == "aling-rosa-catering-2"

def test_make_unique_slug_multiple_conflicts():
    existing = {"aling-rosa-catering", "aling-rosa-catering-2"}
    assert make_unique_slug("aling-rosa-catering", existing) == "aling-rosa-catering-3"
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/test_db.py -v
```

Expected: `ModuleNotFoundError: No module named 'db'`

- [ ] **Step 3: Write db.py**

`scripts/scrape-bisdak/db.py`:
```python
import logging
import os
import re
import uuid

import psycopg2
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def make_unique_slug(base_slug: str, existing: set[str]) -> str:
    if base_slug not in existing:
        return base_slug
    n = 2
    while f"{base_slug}-{n}" in existing:
        n += 1
    return f"{base_slug}-{n}"


def get_conn():
    url = os.environ["DATABASE_URL"]
    return psycopg2.connect(url)


def fetch_existing_names(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT lower(name) FROM submissions")
        subs = {row[0] for row in cur.fetchall()}
        cur.execute("SELECT lower(name) FROM businesses")
        bizs = {row[0] for row in cur.fetchall()}
    return subs | bizs


def fetch_existing_slugs(conn) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT slug FROM submissions")
        return {row[0] for row in cur.fetchall()}


def fetch_category_id(conn, slug: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM categories WHERE slug = %s", (slug,))
        row = cur.fetchone()
        return row[0] if row else None


def fetch_region_id(conn, slug: str) -> int | None:
    if not slug:
        return None
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM regions WHERE slug = %s", (slug,))
        row = cur.fetchone()
        return row[0] if row else None


def insert_submission(conn, *, name: str, slug: str, description: str | None,
                      phone: str | None, website: str | None,
                      facebook_url: str | None, category_id: int | None,
                      region_id: int | None) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO submissions
              (id, name, slug, description, phone, website, facebook_url,
               category_id, region_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
        """, (
            str(uuid.uuid4()), name, slug, description,
            phone, website, facebook_url, category_id, region_id,
        ))
    conn.commit()
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/test_db.py -v
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/db.py scripts/scrape-bisdak/tests/test_db.py
git commit -m "feat(scraper): add db module with slug generation and Supabase insert"
```

---

## Task 6: NoCowboys scraper

**Files:**
- Create: `scripts/scrape-bisdak/scrapers/nocowboys.py`

- [ ] **Step 1: Write nocowboys.py**

`scripts/scrape-bisdak/scrapers/nocowboys.py`:
```python
import logging
import re
from urllib.parse import urlparse

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

SEARCH_TERMS = [
    "filipino-catering",
    "pinoy",
    "filipino-food",
    "filipino-restaurant",
]
BASE_URL = "https://www.nocowboys.co.nz/search/all-areas/{term}"
_SKIP_DOMAINS = {"nocowboys.co.nz", "facebook.com", "google.com"}


class NoCowboysScraper(BaseScraper):
    SOURCE_NAME = "nocowboys"
    MIN_EXPECTED = 2  # Filipino-specific terms yield fewer results

    def _scrape(self) -> list[ScrapedBiz]:
        seen: set[str] = set()
        leads: list[ScrapedBiz] = []
        for term in SEARCH_TERMS:
            logger.info("NoCowboys: scraping term '%s'", term)
            try:
                leads.extend(self._scrape_term(term, seen))
            except Exception as e:
                logger.warning("NoCowboys: failed term '%s': %s", term, e)
        return leads

    def _scrape_term(self, term: str, seen: set[str]) -> list[ScrapedBiz]:
        results: list[ScrapedBiz] = []
        page = 1
        while True:
            url = f"{BASE_URL.format(term=term)}?page={page}&per-page=50"
            soup = self.soup(url)
            cards = soup.select("ul > li:has(h3 > a)")
            if not cards:
                break
            for card in cards:
                biz = self._parse_card(card, url)
                if biz and biz["business_name"].lower() not in seen:
                    seen.add(biz["business_name"].lower())
                    results.append(biz)
            if not soup.select_one("a[rel='next']"):
                break
            page += 1
        return results

    def _parse_card(self, card, source_url: str) -> ScrapedBiz | None:
        link_el = card.select_one("h3 > a[href]")
        if not link_el:
            return None
        name = link_el.get_text(strip=True)
        phone_el = card.select_one("a[href^='tel:']")
        phone = phone_el["href"].replace("tel:", "") if phone_el else None
        location_el = card.select_one("p")
        region_text = None
        if location_el and "–" in location_el.get_text():
            region_text = location_el.get_text(strip=True).split("–")[1].strip()
        desc_el = card.select_one("p.description, p.tagline, p:not(:first-child)")
        description = desc_el.get_text(strip=True)[:200] if desc_el else None
        website = self._get_website(f"https://www.nocowboys.co.nz{link_el['href']}")
        return ScrapedBiz(
            business_name=name,
            description=description,
            phone=phone,
            website=website,
            facebook_url=None,
            region_text=region_text,
            source_name=self.SOURCE_NAME,
            source_url=source_url,
        )

    def _get_website(self, profile_url: str) -> str | None:
        try:
            soup = self.soup(profile_url)
            for a in soup.select("a[href^='http']:not([href*='nocowboys'])"):
                href = a.get("href", "")
                netloc = urlparse(href).netloc
                if netloc.startswith("www."):
                    netloc = netloc[4:]
                if netloc and not any(s in netloc for s in _SKIP_DOMAINS):
                    return f"https://{netloc}"
        except Exception as e:
            logger.debug("NoCowboys: could not fetch profile %s: %s", profile_url, e)
        return None
```

- [ ] **Step 2: Smoke test (fetches live — be patient, 4–9s delay per page)**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -c "
import logging, sys
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
from scrapers.nocowboys import NoCowboysScraper
results = NoCowboysScraper().scrape()
print(f'Got {len(results)} results')
for r in results[:3]:
    print(r['business_name'], '|', r['region_text'])
"
```

Expected: at least some results printed (may be 0 if no Filipino businesses listed there — that's OK, scraper should not error).

- [ ] **Step 3: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/scrapers/nocowboys.py
git commit -m "feat(scraper): add NoCowboys scraper for Filipino business terms"
```

---

## Task 7: Finda scraper

**Files:**
- Create: `scripts/scrape-bisdak/scrapers/finda.py`

- [ ] **Step 1: Write finda.py**

`scripts/scrape-bisdak/scrapers/finda.py`:
```python
import logging
import re
from urllib.parse import urlparse

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

SEARCH_TERMS = ["filipino", "pinoy"]
BASE_URL = "https://www.finda.co.nz/business/s/{term}/{page}/?f=New+Zealand"
_SKIP_DOMAINS = {"finda.co.nz", "facebook.com", "google.com", "instagram.com"}


class FindaScraper(BaseScraper):
    SOURCE_NAME = "finda"
    MIN_EXPECTED = 2

    def __init__(self) -> None:
        super().__init__()
        self.session.verify = False  # Finda cert chain issues on some hosts

    def _scrape(self) -> list[ScrapedBiz]:
        seen: set[str] = set()
        leads: list[ScrapedBiz] = []
        for term in SEARCH_TERMS:
            logger.info("Finda: scraping term '%s'", term)
            try:
                leads.extend(self._scrape_term(term, seen))
            except Exception as e:
                logger.warning("Finda: failed term '%s': %s", term, e)
        return leads

    def _scrape_term(self, term: str, seen: set[str]) -> list[ScrapedBiz]:
        results: list[ScrapedBiz] = []
        page = 1
        while True:
            url = BASE_URL.format(term=term, page=page)
            try:
                soup = self.soup(url)
            except Exception as e:
                logger.warning("Finda: failed page %d for '%s': %s", page, term, e)
                break
            cards = soup.select("div.listing")
            if not cards:
                break
            for card in cards:
                biz = self._parse_card(card, url)
                if biz and biz["business_name"].lower() not in seen:
                    seen.add(biz["business_name"].lower())
                    results.append(biz)
            # Check if next page exists
            next_page_url = BASE_URL.format(term=term, page=page + 1)
            next_soup = None
            try:
                next_soup = self.soup(next_page_url)
            except Exception:
                break
            if not next_soup or not next_soup.select("div.listing"):
                break
            page += 1
        return results

    def _parse_card(self, card, source_url: str) -> ScrapedBiz | None:
        name_el = card.select_one("h2 a[itemprop='name']")
        if not name_el:
            return None
        name = re.sub(r"\s+", " ", name_el.get_text(strip=True))
        phone_el = card.select_one("div[name='phone_number']")
        phone = re.sub(r"\s+", "", phone_el.get_text(strip=True)) if phone_el else None
        website = None
        web_el = card.select_one("a[data-ga-lab='Search_Web_Link']")
        if web_el and web_el.get("href", "").startswith("http"):
            netloc = urlparse(web_el["href"]).netloc
            if netloc.startswith("www."):
                netloc = netloc[4:]
            if netloc and not any(s in netloc for s in _SKIP_DOMAINS):
                website = f"https://{netloc}"
        region_text = None
        addr_el = card.select_one("div[itemprop='address']")
        if addr_el:
            region_text = addr_el.get_text(strip=True) or None
        desc_el = card.select_one("p.description, div.description")
        description = desc_el.get_text(strip=True)[:200] if desc_el else None
        facebook_url = None
        for a in card.select("a[href*='facebook.com']"):
            facebook_url = a["href"]
            break
        return ScrapedBiz(
            business_name=name,
            description=description,
            phone=phone,
            website=website,
            facebook_url=facebook_url,
            region_text=region_text,
            source_name=self.SOURCE_NAME,
            source_url=source_url,
        )
```

- [ ] **Step 2: Smoke test**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -c "
import logging, sys, urllib3
urllib3.disable_warnings()
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
from scrapers.finda import FindaScraper
results = FindaScraper().scrape()
print(f'Got {len(results)} results')
for r in results[:3]:
    print(r['business_name'], '|', r['region_text'])
"
```

Expected: results printed or empty (not an error).

- [ ] **Step 3: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/scrapers/finda.py
git commit -m "feat(scraper): add Finda.co.nz scraper for Filipino businesses"
```

---

## Task 8: PinoysNZ scraper

**Files:**
- Create: `scripts/scrape-bisdak/scrapers/pinoysnz.py`

- [ ] **Step 1: Inspect pinoys.co.nz business pages**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -c "
import requests
from bs4 import BeautifulSoup
resp = requests.get('https://pinoys.co.nz/product-category/advertisers/', timeout=15,
    headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(resp.text, 'lxml')
# Print first few article/product cards to see HTML structure
for el in soup.select('article, .product, .listing-item')[:3]:
    print(el.prettify()[:600])
    print('---')
"
```

Note the actual CSS selectors from the output — you'll use them in the scraper.

- [ ] **Step 2: Write pinoysnz.py**

`scripts/scrape-bisdak/scrapers/pinoysnz.py`:
```python
import logging
import re

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

LISTING_URL = "https://pinoys.co.nz/product-category/advertisers/"


class PinoysNZScraper(BaseScraper):
    SOURCE_NAME = "pinoysnz"
    MIN_EXPECTED = 2

    def _scrape(self) -> list[ScrapedBiz]:
        logger.info("PinoysNZ: scraping %s", LISTING_URL)
        results: list[ScrapedBiz] = []
        page = 1
        while True:
            url = LISTING_URL if page == 1 else f"{LISTING_URL}page/{page}/"
            try:
                soup = self.soup(url)
            except Exception as e:
                logger.warning("PinoysNZ: failed page %d: %s", page, e)
                break
            # Adjust selector based on actual site HTML (see Step 1 inspection)
            cards = soup.select("article.product, li.product, .listing-card")
            if not cards:
                break
            for card in cards:
                biz = self._parse_card(card, url)
                if biz:
                    results.append(biz)
            if not soup.select_one("a.next.page-numbers"):
                break
            page += 1
        return results

    def _parse_card(self, card, source_url: str) -> ScrapedBiz | None:
        name_el = card.select_one("h2, h3, .woocommerce-loop-product__title")
        if not name_el:
            return None
        name = re.sub(r"\s+", " ", name_el.get_text(strip=True))
        if not name:
            return None
        desc_el = card.select_one(".short-description, p.description, .excerpt")
        description = desc_el.get_text(strip=True)[:200] if desc_el else None
        website = None
        link_el = card.select_one("a[href]")
        if link_el:
            href = link_el.get("href", "")
            if href.startswith("http") and "pinoys.co.nz" not in href:
                website = href
        facebook_url = None
        for a in card.select("a[href*='facebook.com']"):
            facebook_url = a["href"]
            break
        return ScrapedBiz(
            business_name=name,
            description=description,
            phone=None,
            website=website,
            facebook_url=facebook_url,
            region_text=None,
            source_name=self.SOURCE_NAME,
            source_url=source_url,
        )
```

- [ ] **Step 3: Smoke test**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -c "
import logging, sys
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
from scrapers.pinoysnz import PinoysNZScraper
results = PinoysNZScraper().scrape()
print(f'Got {len(results)} results')
for r in results[:3]:
    print(r['business_name'], '|', r['description'])
"
```

If the selector returns 0 results, revisit Step 1 output and adjust the `cards` selector in `_parse_card`.

- [ ] **Step 4: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/scrapers/pinoysnz.py
git commit -m "feat(scraper): add pinoys.co.nz scraper"
```

---

## Task 9: run.py — orchestrator

**Files:**
- Create: `scripts/scrape-bisdak/run.py`

- [ ] **Step 1: Write run.py**

`scripts/scrape-bisdak/run.py`:
```python
import logging
import sys

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("run")

from base import ScrapedBiz
from categorizer import categorize
from regions import map_region
from db import (
    get_conn, fetch_existing_names, fetch_existing_slugs,
    fetch_category_id, fetch_region_id, insert_submission, slugify, make_unique_slug,
)
from scrapers.nocowboys import NoCowboysScraper
from scrapers.finda import FindaScraper
from scrapers.pinoysnz import PinoysNZScraper


def run() -> None:
    all_leads: list[ScrapedBiz] = []

    for ScraperClass in [NoCowboysScraper, FindaScraper, PinoysNZScraper]:
        try:
            leads = ScraperClass().scrape()
            logger.info("[%s] scraped %d", ScraperClass.SOURCE_NAME, len(leads))
            all_leads.extend(leads)
        except Exception as e:
            logger.error("[%s] scraper failed: %s", ScraperClass.SOURCE_NAME, e)

    # Deduplicate across sources by name
    seen_names: set[str] = set()
    unique_leads: list[ScrapedBiz] = []
    for lead in all_leads:
        key = lead["business_name"].lower().strip()
        if key not in seen_names:
            seen_names.add(key)
            unique_leads.append(lead)

    logger.info("total scraped: %d | unique: %d", len(all_leads), len(unique_leads))

    conn = get_conn()
    try:
        existing_names = fetch_existing_names(conn)
        existing_slugs = fetch_existing_slugs(conn)

        inserted = 0
        skipped = 0

        for lead in unique_leads:
            name_key = lead["business_name"].lower().strip()
            if name_key in existing_names:
                skipped += 1
                logger.debug("skip (dupe): %s", lead["business_name"])
                continue

            category_slug = categorize(lead["business_name"], lead.get("description"))
            region_slug = map_region(lead.get("region_text"))

            category_id = fetch_category_id(conn, category_slug)
            region_id = fetch_region_id(conn, region_slug) if region_slug else None

            base_slug = slugify(lead["business_name"])
            slug = make_unique_slug(base_slug, existing_slugs)
            existing_slugs.add(slug)

            insert_submission(
                conn,
                name=lead["business_name"],
                slug=slug,
                description=lead.get("description"),
                phone=lead.get("phone"),
                website=lead.get("website"),
                facebook_url=lead.get("facebook_url"),
                category_id=category_id,
                region_id=region_id,
            )
            existing_names.add(name_key)
            inserted += 1
            logger.info("inserted: %s (cat=%s, region=%s)", lead["business_name"], category_slug, region_slug)

    finally:
        conn.close()

    print(f"\n--- BisDak Scraper Summary ---")
    print(f"scraped:  {len(all_leads)}")
    print(f"unique:   {len(unique_leads)}")
    print(f"skipped:  {skipped} (already in DB)")
    print(f"inserted: {inserted} pending submissions")


if __name__ == "__main__":
    run()
```

- [ ] **Step 2: Dry-run without DB (check imports only)**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -c "import run; print('imports OK')"
```

Expected: `imports OK`

- [ ] **Step 3: Run against live DB (copy DATABASE_URL from .env.local)**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
cp ../../.env.local .env   # copies DATABASE_URL into local .env
python run.py
```

Expected: summary printed, check Supabase admin panel at https://bisdak.co.nz/admin to see pending submissions.

- [ ] **Step 4: Verify in BisDak admin**

Visit https://bisdak.co.nz/admin — pending submissions from the scraper should appear in the queue. Approve a few to confirm the full flow works end-to-end.

- [ ] **Step 5: Add .env to .gitignore for this script**

```bash
echo ".env" >> /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak/.gitignore
```

- [ ] **Step 6: Commit**

```bash
cd /Users/openclaw/Projects/bisdak
git add scripts/scrape-bisdak/run.py scripts/scrape-bisdak/.gitignore
git commit -m "feat(scraper): add run.py orchestrator — full pipeline complete"
```

---

## Task 10: Final commit and push

- [ ] **Step 1: Run all tests**

```bash
cd /Users/openclaw/Projects/bisdak/scripts/scrape-bisdak
python -m pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 2: Push to GitHub**

```bash
cd /Users/openclaw/Projects/bisdak
git push
```
