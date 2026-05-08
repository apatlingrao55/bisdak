# MVP Feature Specification — Filipino Hub NZ
**Version:** 1.0 | **Date:** May 2026 | **Status:** Draft

---

## Product Vision

A mobile-first, searchable Filipino business directory for all of New Zealand — the definitive place to find, review, and support Filipino-owned businesses across every region.

**Tagline:** *Find your kababayan's business.*

---

## MVP Scope (Version 1.0)

The MVP solves one problem cleanly: **a Filipino household anywhere in NZ can find a Filipino-owned business in their region within 10 seconds.**

Everything else is V2+.

---

## Core Features

### 1. Business Listings

**What it does:**
- Each listing has: business name, category, region/city, short description (200 chars), phone, website, Facebook URL, Google Maps link
- "Filipino-owned" badge (self-declared on signup, community-flaggable)
- Open/closed status (optional, manual)

**Categories (V1 — 8 core):**
1. Food & Dining (restaurants, bakeries, catering, food stalls)
2. Professional Services (accountants, lawyers, immigration consultants, financial advisors)
3. Health & Wellness (GPs, dentists, nurses, physios, pharmacies)
4. Trades & Home Services (electricians, plumbers, builders, cleaners, landscapers)
5. Beauty & Personal Care (salons, barbers, nail technicians, massage)
6. Remittance & Travel (money transfer agents, travel agencies, cargo/balikbayan box)
7. Retail & Groceries (Filipino grocery stores, online shops, import goods)
8. Community & Events (churches, cultural groups, community organisations)

**Regions (V1 — 5 core):**
- Auckland
- Canterbury (Christchurch)
- Wellington
- Waikato (Hamilton)
- Other NZ

### 2. Search & Filter

- Keyword search (business name, description)
- Filter by: category + region (combined)
- Sort by: newest, most reviewed, alphabetical
- Mobile-optimised search bar as primary UI element

### 3. Reviews & Ratings

- Star rating (1–5) + short text review (max 300 chars)
- Reviewer must provide name + suburb (no login required for V1)
- Business owner can respond to reviews (requires account)
- Flag/report a review button
- No fake review detection in V1 — manual moderation queue

### 4. Business Owner Accounts

- Free signup: email + password
- Claim/create a listing
- Edit listing details
- Respond to reviews
- Mark listing as "Filipino-owned"
- Upload 1 photo (logo or storefront)

### 5. Submit a Business (Public)

- Anyone can submit a business (not just the owner)
- Form fields: name, category, region, phone, website, brief description
- Goes into moderation queue before publishing
- Owner can later claim the listing

---

## Build Sequence

### Week 1–2: Data foundation
- Set up database schema (businesses, categories, regions, reviews, users)
- Seed with 150–200 businesses sourced from Facebook group + manual research
- Basic admin panel to approve/reject submissions

### Week 3–4: Frontend
- Homepage: search bar + category grid + featured listings
- Search results page: filterable list with cards
- Business detail page: full listing + reviews
- Submit a business form

### Week 5–6: Accounts + Reviews
- Business owner signup/login
- Claim listing flow
- Review submission form
- Admin moderation queue for reviews and new submissions

### Week 7: Mobile polish + SEO
- Responsive audit (mobile-first)
- Meta tags per listing page (for Google indexing)
- Sitemap generation
- Basic OG image per listing for social sharing

### Week 8: Soft launch
- Invite 50 business owners to claim listings
- Post in Facebook groups
- Monitor and fix

---

## Tech Stack (Recommended)

| Layer | Recommended | Why |
|---|---|---|
| Framework | Next.js (App Router) | SSR for SEO, fast, Vercel-native |
| Database | PostgreSQL (Neon or Supabase) | Relational, free tier generous |
| Auth | NextAuth or Supabase Auth | Simple, battle-tested |
| Search | Postgres full-text search (V1) | No extra service needed at launch |
| Hosting | Vercel | Free tier sufficient for launch |
| Images | Cloudinary free tier | 1 image per listing |
| Maps | Google Maps Embed (free tier) | Address → map link |

**Upgrade path:** Add Algolia or Meilisearch when listings exceed 1,000 and search latency becomes noticeable.

---

## Out of Scope for V1

- Mobile app (web-first)
- Bilingual UI (English-only V1, Filipino/Tagalog in V2)
- Job board
- Events calendar
- Paid listings / premium tier
- Booking/appointment system
- API

---

## Success Metrics for V1

| Metric | 30-day target | 90-day target |
|---|---|---|
| Business listings | 150 | 400 |
| Monthly unique visitors | 500 | 3,000 |
| Reviews submitted | 50 | 300 |
| Business owner accounts | 40 | 150 |
| Google rankings (Filipino + category + city) | Top 10 | Top 5 |
