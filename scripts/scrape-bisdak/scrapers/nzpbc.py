import logging
import re

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

MEMBERS_URL = "https://www.nzpbc.com/members"


class NZPBCScraper(BaseScraper):
    SOURCE_NAME = "nzpbc"
    MIN_EXPECTED = 10

    def _scrape(self) -> list[ScrapedBiz]:
        try:
            soup = self.soup(MEMBERS_URL)
        except Exception as e:
            logger.error("NZPBC: failed to fetch members page: %s", e)
            return []

        results = []
        seen = set()

        # Wix Pro Gallery: each member card has a title (person name) and
        # description (business name / role). We want the business name.
        for item in soup.select("[data-hook='item-link-wrapper'], .item-link-wrapper"):
            title_el = item.select_one("[data-hook='item-title'] span, .info-element-title span")
            desc_el = item.select_one("[data-hook='item-description'] span, .info-element-description span")

            # Description holds the business name; title holds the person's name
            biz_name = desc_el.get_text(strip=True) if desc_el else ""
            person_name = title_el.get_text(strip=True) if title_el else ""

            # Fall back to person name if no business name
            name = biz_name or person_name
            name = re.sub(r"\s+", " ", name).strip()

            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())

            results.append(ScrapedBiz(
                business_name=name,
                description=None,
                phone=None,
                website=None,
                facebook_url=None,
                region_text=None,
                source_name=self.SOURCE_NAME,
                source_url=MEMBERS_URL,
            ))

        if not results:
            logger.warning(
                "NZPBC: 0 members parsed — Wix gallery may be JS-rendered. "
                "Run with Playwright if needed."
            )
        return results
