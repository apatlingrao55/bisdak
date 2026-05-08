import logging
import re
from typing import Optional

from base import BaseScraper, ScrapedBiz

logger = logging.getLogger(__name__)

PAGES = [
    "https://nzwao.com/Filipino/",
    "https://nzwao.com/Pinoy/",
]

_CITY_RE = re.compile(
    r"\b(auckland|manukau|north shore|henderson|papakura|wellington|lower hutt|upper hutt|"
    r"porirua|christchurch|hamilton|waikato|tauranga|rotorua|napier|palmerston north|dunedin)\b",
    re.IGNORECASE,
)


class NZWAOScraper(BaseScraper):
    SOURCE_NAME = "nzwao"
    MIN_EXPECTED = 5

    def _scrape(self) -> list[ScrapedBiz]:
        results = []
        seen = set()
        for url in PAGES:
            try:
                soup = self.soup(url)
            except Exception as e:
                logger.warning("NZWAO: failed %s: %s", url, e)
                continue
            for link in soup.select("a.company-list-link"):
                status_el = link.select_one(".company-list-status span")
                if status_el and "registered" not in status_el.get_text(strip=True).lower():
                    continue
                name_el = link.select_one("h4.company-list-heading")
                if not name_el:
                    continue
                raw_name = name_el.get_text(strip=True)
                name = _clean_name(raw_name)
                if not name or name.lower() in seen:
                    continue
                seen.add(name.lower())

                desc_el = link.select_one("p.company-list-description")
                desc_text = desc_el.get_text(strip=True) if desc_el else ""
                region_text = _extract_city(desc_text)

                results.append(ScrapedBiz(
                    business_name=name,
                    description=None,
                    phone=None,
                    website=None,
                    facebook_url=None,
                    region_text=region_text,
                    source_name=self.SOURCE_NAME,
                    source_url=url,
                ))
        return results


def _clean_name(raw: str) -> str:
    name = raw.strip().title()
    name = re.sub(r"\s+Limited$", "", name, flags=re.IGNORECASE).strip()
    return name


def _extract_city(text: str) -> Optional[str]:
    m = _CITY_RE.search(text)
    return m.group(0).title() if m else None
