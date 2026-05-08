# BisDak Business Scraper — Design Spec

**Date:** 2026-05-08
**Status:** Approved

## Goal

Automate discovery and import of Filipino-owned businesses in New Zealand into BisDak. Scraped businesses land in the `submissions` table as `pending` and are approved/rejected via the existing admin panel — no new UI needed.

## Location

`scripts/scrape-bisdak/` inside the BisDak repo. Self-contained Python package, not deployed to Vercel.

## Sources

| Scraper | Target | Search terms |
|---|---|---|
| `NoCowboysScraper` | nocowboys.co.nz | `filipino-catering`, `pinoy`, `filipino-food`, `filipino-restaurant` |
| `FindaScraper` | finda.co.nz | `filipino`, `pinoy` |
| `PinoysNZScraper` | pinoys.co.nz | Business advertiser listing pages |

## Pipeline (per run)

```
scrape all sources
  → deduplicate by name (case-insensitive) across sources
  → for each unique lead:
      1. keyword-categorize into one of 8 BisDak categories
      2. map region text → BisDak region slug
      3. skip if name already exists in submissions or businesses tables
      4. insert into submissions as status='pending'
  → print summary: N scraped, M skipped (dupe), K inserted
```

## Categorization (keyword matching, no API)

Match against business name + description (lowercase). First match wins. Fallback: `professional-services` (flagged for manual review).

| Category slug | Keywords |
|---|---|
| `food-dining` | food, catering, restaurant, lechon, bakery, cafe, kain, lutong, kusina, karinderya, bbq, grill |
| `beauty-personal-care` | salon, nails, beauty, spa, hair, barber, lash, wax, brow, makeup |
| `remittance-travel` | remittance, padala, travel, forex, visa, money transfer, balikbayan |
| `retail-groceries` | grocery, store, shop, tiangge, retail, market, sari-sari |
| `trades-home-services` | plumber, electrician, builder, cleaning, painter, carpenter, renovation, handyman, trades |
| `health-wellness` | nurse, dental, physio, medical, health, clinic, therapy, care, aged care |
| `community-events` | church, community, events, association, org, fiesta, festival, cultural |
| `professional-services` | accountant, lawyer, bookkeeper, consultant, insurance, notary, tax, mortgage, finance |

## Region mapping

Map scraped location text (contains) → BisDak region slug:

| Match text | Slug |
|---|---|
| auckland, manukau, waitakere, north shore, henderson, otahuhu, papakura | `auckland` |
| wellington, lower hutt, upper hutt, porirua, kapiti | `wellington` |
| christchurch, canterbury, selwyn, waimakariri | `canterbury` |
| hamilton, waikato, cambridge, te awamutu | `waikato` |
| tauranga, bay of plenty, rotorua, whakatane | `bay-of-plenty` |

No match → `null` regionId (admin assigns during review).

## Data model (submissions table)

Fields populated by scraper:

```
name          — scraped business name
slug          — slugified name, unique collision handled with suffix
description   — scraped description or null
phone         — scraped phone or null
website       — scraped website or null
facebookUrl   — scraped Facebook URL or null
categoryId    — resolved from keyword match, or null if no match
regionId      — resolved from region map, or null if no match
status        — 'pending' (always)
submitterEmail — null (scraper-originated)
```

## File structure

```
scripts/scrape-bisdak/
├── run.py              — entry point: python run.py
├── base.py             — BaseScraper (ported from InspectPro)
├── categorizer.py      — keyword → category slug
├── regions.py          — location text → region slug
├── db.py               — Supabase connection + dedup + insert
├── scrapers/
│   ├── nocowboys.py
│   ├── finda.py
│   └── pinoysnz.py
├── requirements.txt
└── .env.example        — DATABASE_URL only
```

## Config

`.env` (or export in shell) — single variable:

```
DATABASE_URL=postgresql://...   # reuse existing bisdak value
```

## Running

```bash
cd scripts/scrape-bisdak
pip install -r requirements.txt
python run.py
```

Output:
```
[nocowboys] scraped 14 leads
[finda]     scraped 8 leads
[pinoysnz]  scraped 22 leads
deduped: 38 unique leads
skipped: 6 already in DB
inserted: 32 pending submissions
```

## Constraints

- Robots.txt respected via `BaseScraper`
- 4–9s random delay between requests
- User-agent rotation (3 desktop UAs)
- No Anthropic API — categorization is pure keyword matching
- No email harvesting or outreach — read-only scrape → DB insert only
- Scraper-inserted submissions are indistinguishable from user-submitted ones in admin panel
