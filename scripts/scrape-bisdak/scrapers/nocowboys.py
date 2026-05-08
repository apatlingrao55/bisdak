import logging
import re
from urllib.parse import urlparse

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

# NoCowboys does not support keyword search — it redirects all queries to
# generic results. We browse the site using a text query parameter but
# accept that 0 Filipino-specific results is a valid outcome.
SEARCH_TERMS = [
    "filipino catering",
    "pinoy",
    "filipino food",
    "filipino restaurant",
]
BASE_URL = "https://www.nocowboys.co.nz/search/all-areas/all-categories"
_SKIP_DOMAINS = {"nocowboys.co.nz", "facebook.com", "google.com"}


class NoCowboysScraper(BaseScraper):
    SOURCE_NAME = "nocowboys"
    MIN_EXPECTED = 2

    def _scrape(self):
        seen = set()
        leads = []
        for term in SEARCH_TERMS:
            logger.info("NoCowboys: scraping term '%s'", term)
            try:
                leads.extend(self._scrape_term(term, seen))
            except Exception as e:
                logger.warning("NoCowboys: failed term '%s': %s", term, e)
        return leads

    def _scrape_term(self, term, seen):
        results = []
        page = 1
        while True:
            url = f"{BASE_URL}?q={term.replace(' ', '+')}&page={page}&per-page=50"
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
        # Filter only names that look Filipino-related; if none, return empty
        filtered = [b for b in results if self._is_filipino(b["business_name"])]
        logger.info("NoCowboys: term '%s' => %d raw, %d Filipino-looking", term, len(results), len(filtered))
        return filtered

    def _is_filipino(self, name: str) -> bool:
        tokens = {"filipino", "pinoy", "pinay", "pilipino", "panlasang", "lutong",
                  "bisaya", "cebuano", "halo-halo", "adobo", "lechon", "sari-sari"}
        lower = name.lower()
        return any(t in lower for t in tokens)

    def _parse_card(self, card, source_url):
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

    def _get_website(self, profile_url):
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
