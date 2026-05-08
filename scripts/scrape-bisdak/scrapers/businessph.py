import logging
from typing import Optional

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

API_URL = "https://www.businessph.co.nz/api/businesses"
PAGE_SIZE = 200
SKIP_CATEGORIES = {"individual"}


class BusinessPHScraper(BaseScraper):
    SOURCE_NAME = "businessph"
    MIN_EXPECTED = 100
    MIN_DELAY = 2.0
    MAX_DELAY = 5.0

    def _scrape(self) -> list[ScrapedBiz]:
        results = []
        page = 1
        while True:
            resp = self.get(f"{API_URL}?page={page}&limit={PAGE_SIZE}")
            batch = resp.json()
            if not batch:
                break
            for biz in batch:
                if biz.get("category") in SKIP_CATEGORIES:
                    continue
                lead = self._parse(biz)
                if lead:
                    results.append(lead)
            logger.info("BusinessPH: page %d — %d so far", page, len(results))
            if len(batch) < PAGE_SIZE:
                break
            page += 1
        return results

    def _parse(self, biz: dict) -> Optional[ScrapedBiz]:
        name = (biz.get("name") or "").strip()
        if not name:
            return None

        social = biz.get("socialLinks") or {}
        facebook_url = social.get("facebook") or None
        if facebook_url and "facebook.com" not in facebook_url:
            facebook_url = None

        website = (biz.get("website") or "").strip() or None

        description = (biz.get("description") or "").strip() or None
        if not description:
            services = biz.get("services") or []
            if services:
                description = ", ".join(services[:5])

        region_text = biz.get("location") or biz.get("address") or None

        return ScrapedBiz(
            business_name=name,
            description=description,
            phone=(biz.get("phone") or "").strip() or None,
            website=website,
            facebook_url=facebook_url,
            region_text=region_text,
            source_name=self.SOURCE_NAME,
            source_url="https://www.businessph.co.nz",
        )
