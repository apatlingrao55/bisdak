import logging
import re

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

# The /product-category/advertisers/ path 404s; the real listing is /business-finder/
LISTING_URL = "https://pinoys.co.nz/business-finder/"
_PINOYS_DOMAIN = "pinoys.co.nz"


class PinoysNZScraper(BaseScraper):
    SOURCE_NAME = "pinoysnz"
    MIN_EXPECTED = 2

    def _scrape(self):
        logger.info("PinoysNZ: scraping %s", LISTING_URL)
        results = []
        seen = set()
        page = 1
        while True:
            url = LISTING_URL if page == 1 else f"{LISTING_URL}page/{page}/"
            try:
                soup = self.soup(url)
            except Exception as e:
                logger.warning("PinoysNZ: failed page %d: %s", page, e)
                break
            # Cards are <article> elements with class gd_place (GeoDirectory plugin)
            cards = soup.select("article.gd_place, article[class*='gd_place']")
            if not cards:
                # Fallback: any article on the page
                cards = soup.select("article")
            if not cards:
                break
            for card in cards:
                biz = self._parse_card(card, url)
                if biz and biz["business_name"].lower() not in seen:
                    seen.add(biz["business_name"].lower())
                    results.append(biz)
            # Pagination: next page link
            if not soup.select_one("a.next.page-link, a.next.page-numbers"):
                break
            page += 1
        return results

    def _parse_card(self, card, source_url):
        # Name is in h2.elementor-heading-title > a (GeoDirectory + Elementor)
        name_el = card.select_one("h2.elementor-heading-title a, h2 a, h3 a")
        if not name_el:
            return None
        name = re.sub(r"\s+", " ", name_el.get_text(strip=True))
        if not name:
            return None

        # Description: GeoDirectory short description or any paragraph
        desc_el = card.select_one(".geodir-field-short_description, .short-description, p.description")
        description = desc_el.get_text(strip=True)[:200] if desc_el else None

        # External website: any <a> that is NOT a pinoys.co.nz internal link
        # and NOT a facebook/maps link
        website = None
        facebook_url = None
        for a in card.select("a[href]"):
            href = a.get("href", "")
            if not href.startswith("http"):
                continue
            if "facebook.com" in href and not facebook_url:
                facebook_url = href
                continue
            if "maps.google" in href or "google.com" in href:
                continue
            if _PINOYS_DOMAIN in href:
                continue
            # First non-internal, non-facebook, non-maps external link = website
            if website is None:
                website = href

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
