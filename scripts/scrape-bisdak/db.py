import logging
import os
import re
import uuid
from typing import Optional

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


def fetch_category_id(conn, slug: str) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM categories WHERE slug = %s", (slug,))
        row = cur.fetchone()
        return row[0] if row else None


def fetch_region_id(conn, slug: str) -> Optional[int]:
    if not slug:
        return None
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM regions WHERE slug = %s", (slug,))
        row = cur.fetchone()
        return row[0] if row else None


def insert_submission(conn, *, name: str, slug: str, description: Optional[str],
                      phone: Optional[str], website: Optional[str],
                      facebook_url: Optional[str], category_id: Optional[int],
                      region_id: Optional[int]) -> None:
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
