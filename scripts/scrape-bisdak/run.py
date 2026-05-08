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
from scrapers.finda import FindaScraper
from scrapers.pinoysnz import PinoysNZScraper


def run():
    all_leads = []

    for ScraperClass in [FindaScraper, PinoysNZScraper]:
        try:
            leads = ScraperClass().scrape()
            logger.info("[%s] scraped %d", ScraperClass.SOURCE_NAME, len(leads))
            all_leads.extend(leads)
        except Exception as e:
            logger.error("[%s] scraper failed: %s", ScraperClass.SOURCE_NAME, e)

    # Deduplicate across sources by name
    seen_names = set()
    unique_leads = []
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
