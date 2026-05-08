import logging
import re
from urllib.parse import urlparse

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

SEARCH_TERMS = ["filipino", "pinoy"]
# Finda paginates via /{page}/ segment; f=New+Zealand filters to NZ only
BASE_URL = "https://www.finda.co.nz/business/s/{term}/{page}/?f=New+Zealand"
_SKIP_DOMAINS = {"finda.co.nz", "facebook.com", "google.com", "instagram.com"}


class FindaScraper(BaseScraper):
    SOURCE_NAME = "finda"
    MIN_EXPECTED = 2

    def __init__(self):
        super().__init__()
        self.session.verify = False

    def _scrape(self):
        seen = set()
        leads = []
        for term in SEARCH_TERMS:
            logger.info("Finda: scraping term '%s'", term)
            try:
                leads.extend(self._scrape_term(term, seen))
            except Exception as e:
                logger.warning("Finda: failed term '%s': %s", term, e)
        return leads

    def _scrape_term(self, term, seen):
        results = []
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
            page += 1
        return results

    def _parse_card(self, card, source_url):
        # Name: h2 > a[itemprop='name']
        name_el = card.select_one("h2 a[itemprop='name']")
        if not name_el:
            return None
        name = re.sub(r"\s+", " ", name_el.get_text(strip=True))
        if not name:
            return None

        # Phone: hidden div with itemprop='telephone' name='phone_number'
        phone_el = card.select_one("div[itemprop='telephone'][name='phone_number']")
        phone = re.sub(r"\s+", "", phone_el.get_text(strip=True)) if phone_el else None

        # Website: a[data-ga-lab='Search_Web_Link'] with a real http href
        website = None
        web_el = card.select_one("a[data-ga-lab='Search_Web_Link']")
        if web_el:
            href = web_el.get("href", "")
            if href.startswith("http"):
                netloc = urlparse(href).netloc
                if netloc.startswith("www."):
                    netloc = netloc[4:]
                if netloc and not any(s in netloc for s in _SKIP_DOMAINS):
                    website = f"https://{netloc}"

        # Address / region: streetAddress span inside itemprop='address'
        region_text = None
        addr_el = card.select_one("span[itemprop='streetAddress']")
        if addr_el:
            region_text = addr_el.get_text(strip=True) or None

        # Description: div.bus_desc
        desc_el = card.select_one("div.bus_desc")
        description = None
        if desc_el:
            # strip "More about X" link text from description
            for a in desc_el.select("a"):
                a.decompose()
            description = desc_el.get_text(strip=True)[:200] or None

        # Facebook URL (not typically in Finda cards, but check just in case)
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
