import logging
import random
import time
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Optional, TypedDict

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
    description: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    facebook_url: Optional[str]
    region_text: Optional[str]
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
