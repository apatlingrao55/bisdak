# Filipino Hub NZ — Strategy Package
*May 2026*

---

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


---


# Go-to-Market Strategy — Filipino Hub NZ
**Version:** 1.0 | **Date:** May 2026

---

## The Core Insight

The Filipino community in NZ already has a 120,000-member Facebook group (Pinoys in NZ) where members daily ask "where can I find a Filipino [business type] in [city]?" — and get answers buried in unindexed comment threads. The GTM strategy does not build demand. It captures demand that already exists and gives it a permanent, searchable home.

**The move:** Convert Facebook group behaviour into directory behaviour.

---

## Phase 1: Pre-Launch — Seed the Supply (Weeks 1–4)

**Goal:** Have 150+ listings live before public launch. A directory with thin listings fails on day one.

### Step 1.1 — Manual Seeding
Research and create listings for Filipino-owned businesses without contacting them first:
- Search Facebook for Filipino business pages in NZ
- Search Google Maps for "Filipino restaurant Auckland/Christchurch/Wellington"
- Harvest recommendations from Facebook group posts (search group for "where can I find")
- Check NZPBC member directory for business names

Target breakdown:
- Auckland: 80 listings
- Canterbury: 30 listings
- Wellington: 20 listings
- Other NZ: 20 listings

### Step 1.2 — Owner Outreach (Personal DMs)
Once listings exist, DM the business owner on Facebook:

> "Hi [Name], I listed [Business Name] on Filipino Hub NZ — a new directory for Filipino businesses across NZ. It's free. Here's your listing: [URL]. Want to claim it and add more details?"

This reverses the cold outreach problem: you're giving them something, not asking for something.

### Step 1.3 — NZPBC Partnership
Approach NZPBC with a simple offer: list all their members free, feature NZPBC as the "founding partner" on the homepage. This gives instant credibility + potentially 50–100 listings from their member base.

---

## Phase 2: Launch — Facebook Group Activation (Week 5–6)

### The Facebook Group Strategy

**Primary target: Pinoys in NZ (120,000 members)**

This is the single most important channel. The approach must be authentic, not promotional.

**Launch post (not an ad — a story):**

> "For years we've watched people post 'where can I find a Filipino dentist in Christchurch?' and the answers disappear into the comments. We built Filipino Hub NZ so those answers never get lost. It's a searchable directory of Filipino-owned businesses across all of NZ — free to search, free to list.
>
> We already have [X] businesses listed. If yours isn't there, add it free: [URL]
>
> If you know a Filipino business that should be listed — tag them below."

**Why this works:** The post solves a problem the group members already have. The "tag them below" mechanic turns the comment section into a crowdsourced listing drive. Business owners get tagged, see their community promoting them, and claim their listing.

### Secondary Facebook Channels
Post in (with adapted messaging):
- Filipinos in New Zealand (separate page/group)
- New Zealand Filipino Workers group
- City-specific Filipino groups (Auckland Filipinos, Christchurch Pinoys, etc.)
- Pinoys in NZ Marketing and Info Services

### Timing
Launch post goes live on a Friday evening (NZT) — peak engagement time for the community.

---

## Phase 3: Growth — SEO + Community Flywheel (Months 2–6)

### SEO Strategy

**Target keywords (high intent, low competition):**
- "Filipino restaurant Auckland"
- "Filipino accountant Christchurch"
- "Filipino doctor Wellington"
- "Filipino grocery store NZ"
- "balikbayan box NZ"
- "Filipino cleaning services Auckland"

Each listing page is a dedicated SEO asset. A listing titled "Maria's Filipino Catering — Auckland" with a description, category, and region will rank for long-tail searches that no general directory (Yellow Pages, Google Maps) optimises for culturally.

**Content layer (V2):** Short blog posts targeting specific queries:
- "Best Filipino restaurants in Christchurch 2026"
- "How to find a Filipino immigration consultant in NZ"

### The Flywheel
1. User searches Google for Filipino business → lands on directory listing
2. Leaves a review
3. Business owner sees review → claims listing → improves profile
4. Better listing → higher ranking → more visitors
5. More reviews → more trust → more conversions
6. More conversions → business owner upgrades to paid listing

### Community Ambassador Programme (Month 3+)
Recruit 1 ambassador per city (Auckland, Christchurch, Wellington, Hamilton) from within the Facebook community. Role: post in local groups, DM unclaimed businesses, organise a small "Filipino Business Spotlight" monthly feature. Compensation: free premium listing for their own business (if applicable) + community recognition.

---

## Phase 4: Retention — Keep Businesses Engaged

**Monthly email to listed business owners:**
- "Your listing got X profile views this month"
- "You have [N] new reviews"
- "Tip: add your logo to increase click-through by 40%"

This email creates the perception of value even before premium features launch, warming businesses toward paid upgrades.

**Annual Filipino Business Awards (Year 2):**
Run a community-voted "Best Filipino Business in NZ" award across categories. Voting drives traffic. Winners get a badge on their listing. Press release to NZ Filipino media (Filipino News, Migrant News). This becomes an annual anchor event that sustains directory relevance beyond the initial launch surge.

---

## Launch Timeline Summary

| Week | Action |
|---|---|
| 1–4 | Seed 150 listings, NZPBC outreach, owner DMs |
| 5 | Soft launch to 50 early business owners |
| 6 | Facebook group launch post + secondary groups |
| 7–8 | Monitor, respond to every comment/tag, fix bugs |
| Month 2 | SEO audit, start targeting long-tail keywords |
| Month 3 | Ambassador programme launch |
| Month 4–6 | Premium listings soft-launch to most active owners |


---


# Monetisation Model — Filipino Hub NZ
**Version:** 1.0 | **Date:** May 2026

---

## Principle

Monetise after value is proven. The directory must be genuinely useful before asking anyone to pay. The sequence is: free listings → demonstrated traffic → premium upsell.

**Do not charge at launch.** Every friction point before critical mass kills the directory.

---

## Revenue Streams

### Stream 1: Premium Listings (Primary)

Launched at Month 4–6, once the directory has 300+ listings and measurable traffic.

| Tier | Price (NZD/month) | Features |
|---|---|---|
| **Free** | $0 | Basic listing, 1 photo, reviews visible |
| **Standard** | $29/month | Top of category search results, 5 photos, "Verified Filipino-Owned" badge, business hours, respond to reviews, monthly view stats |
| **Featured** | $79/month | Homepage featured slot (rotating), top of region + category results, unlimited photos, social links, promotional banner, priority review responses, quarterly performance report |

**Revenue projection (Month 12):**
- 400 total listings
- 10% on Standard (40 × $29) = $1,160/month
- 3% on Featured (12 × $79) = $948/month
- **Total MRR: ~$2,100/month (~$25,200 ARR)**

**Revenue projection (Month 24):**
- 800 total listings
- 15% on Standard (120 × $29) = $3,480/month
- 5% on Featured (40 × $79) = $3,160/month
- **Total MRR: ~$6,600/month (~$79,200 ARR)**

---

### Stream 2: Sponsored Listings / Display Advertising

Businesses that serve the Filipino community but are not Filipino-owned (remittance services, airlines, OFW support, cargo companies) are natural advertisers.

**Ad placements:**
- Homepage banner: $300/month
- Category page sidebar (e.g., Remittance category): $150/month
- Newsletter sponsor (if email list launched): $100/send

**Natural advertisers to approach:**
- Western Union / MoneyGram / Remitly NZ
- Philippine Airlines NZ
- Balikbayan box / LBC Express NZ
- Filipino grocery importers
- NZ immigration law firms serving Filipino clients
- Philippine Overseas Labour Office (POLO) Wellington

**Revenue projection (Month 12):** 3–4 ad slots filled = $600–$900/month

---

### Stream 3: Event Listings

Filipino community events are currently announced through Facebook and scattered across multiple groups. A dedicated events section creates a new revenue line.

| Event Tier | Price | Includes |
|---|---|---|
| Free event listing | $0 | Basic event (name, date, description, link) |
| Featured event | $49/event | Homepage event spotlight, category featured, social-share card |
| Sponsored event | $149/event | Full banner treatment, email newsletter mention, pinned for 2 weeks |

**Target events:** Fiesta Pilipinas, church fiestas, NZPBC business forums, community pageants, Filipino food festivals, professional networking events.

**Revenue projection (Month 12):** 4–6 featured/sponsored events per month = $400–$600/month

---

### Stream 4: Job Board (V2 — Month 9+)

Filipino-owned businesses actively seek Filipino employees, and community members help each other find work. A simple job board extension is a natural V2 revenue line.

| Listing Type | Price |
|---|---|
| Free job post (7 days) | $0 |
| Standard job post (30 days) | $39 |
| Featured job post (30 days, top of results) | $79 |

**Revenue projection (Month 18):** 10–15 paid job posts/month = $500–$800/month

---

### Stream 5: Affiliate Revenue (Opportunistic)

Commission on referrals to high-value services used by the Filipino community:
- Remittance services (2–3% affiliate commission on first transfer)
- Travel insurance (flat fee per signup)
- OFW-specific financial products

This requires no product work — just affiliate link integration on relevant listing pages. Revenue is unpredictable but low-effort.

---

## Revenue Summary by Stage

| Stage | Monthly Revenue | Key Driver |
|---|---|---|
| Launch (Month 1–3) | $0 | Building supply and traffic |
| Early (Month 4–6) | $300–$600 | First ad sales, early premium adopters |
| Growth (Month 7–12) | $2,500–$3,500 | Premium listings + ads + events |
| Scale (Month 13–24) | $6,000–$9,000 | Expanded listings + job board + more ads |

---

## Cost Structure

| Item | Monthly Cost (NZD) |
|---|---|
| Vercel hosting (Pro) | $30 |
| Database (Neon/Supabase Pro) | $25 |
| Cloudinary (image hosting) | $0–$20 |
| Domain + email | $5 |
| **Total infrastructure** | **~$60–$80/month** |

The directory is profitable from the first premium listing sale. Break-even is extremely low given infrastructure costs.

---

## Pricing Philosophy

- Free tier must be genuinely useful — not crippled
- Standard tier ($29) priced below a Facebook boost ($30–$50 for comparable reach) to make the upgrade decision easy
- Featured tier ($79) priced for businesses with real revenue at stake (trades, healthcare, professional services) where one new client per month pays for it many times over
- Annual payment option: 2 months free (Standard $290/year, Featured $790/year) — improves cash flow and reduces churn


---


# Competitive Positioning — Filipino Hub NZ
**Version:** 1.0 | **Date:** May 2026

---

## Competitive Landscape Summary

Three platforms occupy adjacent space. None is a direct, functional competitor for the product described.

---

## Head-to-Head Analysis

### BusinessPH (businessph.co.nz)

**What they claim:**
"New Zealand's premier Filipino business directory" — comprehensive listings of Filipino-owned businesses, events, job opportunities, property listings, and community resources.

**What they actually offer (based on available evidence):**
- A website that describes a vision of comprehensive coverage
- Blocks all external web access (HTTP 403 across all endpoints), making independent audit impossible
- No independently verifiable listing count
- No user reviews or ratings found anywhere in indexed sources
- No evidence of community engagement or social proof outside their own site copy
- No discussion of BusinessPH in the Filipino community's own Facebook groups

**The verdict:** BusinessPH has the right name and the right positioning statement. Whether it has the listings depth, active user base, and search functionality to back that up cannot be independently confirmed — and a directory that is invisible to search engines and auditors is invisible to the consumers it claims to serve. A well-executed, SEO-optimised directory with genuine listings will outrank BusinessPH for every keyword that matters within 6 months.

**Filipino Hub NZ advantage over BusinessPH:**
- Verified listings depth (seeded before launch)
- Verified reviews (community-generated social proof)
- Regional coverage (not Auckland-centric)
- Indexable by Google (publicly crawlable)
- Community-built trust rather than claimed credibility

---

### Pinoys in NZ / pinoys.co.nz

**What they have:**
- 120,000-member Facebook group — the most valuable community asset in this space
- 13-year community history and genuine brand trust
- Monetisation infrastructure (ad packages, online stores, courses, affiliate programme)
- A team that understands the Filipino NZ market deeply

**What their "directory" is:**
- An Expression of Interest form — not a populated, searchable index of businesses
- A recruitment page asking businesses to register, not a functional discovery tool
- No evidence of structured categories, regional filtering, or reviews

**The key insight:** Pinoys in NZ is a media and community business that has identified the directory as an opportunity but has not yet built it. Their Facebook group is their actual product. The website is secondary.

**The relationship opportunity:** Pinoys in NZ is not purely a competitor — it is a potential distribution partner. A listing partnership where Filipino Hub NZ provides the structured directory infrastructure and Pinoys in NZ provides community distribution (promotion in the Facebook group) could benefit both parties. This should be explored before assuming a competitive posture.

**Filipino Hub NZ advantage over pinoys.co.nz:**
- Directory is the core product, not an add-on
- Searchable, filterable, reviewable from day one
- SEO-optimised listing pages indexed by Google
- Not dependent on Facebook algorithm for discovery

**Filipino Hub NZ disadvantage vs pinoys.co.nz:**
- No existing audience
- No brand trust
- Must build from zero

**Mitigation:** The Facebook group dependency is the disadvantage and the solution simultaneously — launch through the same community channels, and the audience comes with it.

---

### NZPBC (nzpbc.com)

**What they are:** A B2B trade council facilitating New Zealand–Philippines commercial relationships. Not a consumer directory. Networking events, seminars, government liaison.

**Verdict:** Not a competitor. A potential partner (list their members, co-brand as "NZPBC Founding Partner").

---

## Positioning Statement

Filipino Hub NZ is not trying to out-community Pinoys in NZ. It is trying to out-index them on Google and out-structure them on discovery.

> **Filipino Hub NZ: The Filipino business directory New Zealand searches for.**

The positioning is searchability + trustworthiness + national coverage — the three things no existing platform delivers.

---

## Positioning Matrix

| Feature | Filipino Hub NZ | BusinessPH | pinoys.co.nz | NZPBC |
|---|---|---|---|---|
| Searchable directory | ✅ Core product | ❓ Unverifiable | ❌ EOI form only | ❌ Not a directory |
| Verified reviews | ✅ V1 feature | ❌ None found | ❌ None | ❌ Not a directory |
| National coverage | ✅ 5 regions at launch | ❓ Unknown | ❌ Auckland-centric | ❌ Auckland-centric |
| SEO-optimised listings | ✅ Per-listing pages | ❌ Blocks crawlers | ❌ Not structured | ❌ Not a directory |
| Community trust | 🔄 Build via Facebook | ❓ Opaque | ✅ 13-year brand | ✅ Established B2B |
| Free basic listing | ✅ Permanently free | ❓ Unknown | ❓ Unclear | ❌ Membership fee |
| Mobile-first | ✅ Design priority | ❓ Unknown | ✅ Facebook-driven | ❌ Not applicable |

---

## Competitive Moats to Build

**Short-term (Year 1):** Listings depth and Google rankings. Once Filipino Hub NZ ranks for "Filipino [category] [city]" keywords, organic traffic becomes self-reinforcing and very difficult for competitors to displace without matching the SEO investment.

**Medium-term (Year 2):** Reviews volume. A directory with 500+ authentic community reviews is trusted in a way that no new entrant can replicate quickly. Social proof compounds.

**Long-term (Year 3+):** Brand = destination. When Filipino community members in NZ think "I need to find a Filipino business," Filipino Hub NZ should be the first URL they type. This is achieved through consistent community presence, annual events (Filipino Business Awards), and being the platform that Filipino media in NZ references.

---

## Key Risk: Pinoys in NZ Builds Their Directory

If the Pinoys in NZ team executes on their Expression of Interest page and launches a real, populated directory backed by their 120,000-member Facebook group, they would be a formidable competitor. Their community distribution advantage is real.

**Mitigation strategy:** Move fast. Seed 150+ listings and get the Facebook group launch post live before Pinoys in NZ activates their directory. Once Filipino Hub NZ has community awareness and Google rankings, the cost to displace it rises significantly. First-mover advantage in a niche with strong SEO dynamics is durable.

The alternative mitigation — approaching Pinoys in NZ with a partnership proposal — should also be considered seriously. A white-label arrangement where Filipino Hub NZ powers the Pinoys in NZ directory could capture the best of both: the directory infrastructure and the community distribution, without a destructive competition for the same audience.
