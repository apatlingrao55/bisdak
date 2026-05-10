# Design: Job Board (MVP)

**Date:** 2026-05-11
**Status:** Approved

## Overview

Add a job board to BisDak so claimed-business owners can post job listings and visitors can browse them. Lean MVP: external apply only (no in-app applications, no resume uploads), auto-publish (no moderation queue), public browse with sign-in required only at the apply step.

One new table (`jobs`), no new auth, no file storage, no payments.

---

## Decisions (locked from brainstorming)

| Topic | Choice |
|---|---|
| Scope | Lean MVP |
| Who can post | Claimed business owners only (uses existing `business_claims`) |
| Apply mechanism | External — `apply_url` or `apply_email`, exactly one required |
| Moderation | Auto-publish (claim approval is the trust gate) |
| Auth gate | Sign-in required only to apply; browsing is public and indexable |
| Lifecycle | Auto-expire after 60 days + manual "Close" button |
| Discovery | Reverse-chron list + region filter + employment type filter + keyword search on title |
| Per-job location | Inherited from business region (no override in v1) |
| Per-job salary | Single optional free-text field |

---

## Architecture

A new top-level `/jobs` feature that piggybacks on existing infrastructure.

**Reuse from existing code:**
- `business_claims` (status `'approved'`) authorises job CRUD.
- `regions` provides the region filter.
- NextAuth session gates the apply action.
- `RouteProgress` and tap-feedback styles work without changes.
- Sitemap iterates dynamic content already — extend for jobs.

**Boundaries:**
- **Posting** lives inside the existing dashboard (`app/dashboard`).
- **Discovery** is a new public route tree (`app/jobs/`).
- **Apply** is a single client component with auth-gated click-through.

**Out of scope for v1 (YAGNI):** in-app applications, resume uploads, applicant tracking, payments, featured/sponsored placement, alerts/email digests, seeker profiles, jobs unbound from a business, multi-location postings, admin moderation surface.

---

## Database schema

One new table. Drizzle.

```ts
// lib/db/schema.ts
export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),                                               // nanoid
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),                                // plain text, render with line breaks
  employmentType: text('employment_type').notNull(),                         // 'full_time' | 'part_time' | 'casual' | 'contract'
  applyUrl: text('apply_url'),                                               // exactly one of apply_url / apply_email is required (app-level + CHECK)
  applyEmail: text('apply_email'),
  salary: text('salary'),                                                    // optional free text, ≤ 60 chars
  status: text('status').default('open').notNull(),                          // 'open' | 'closed'
  postedAt: timestamp('posted_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),                              // postedAt + 60d, set in app code
  closedAt: timestamp('closed_at'),                                          // set when owner manually closes
})
```

**Indexes:**
- `(status, expires_at)` for the public list query
- `(business_id)` for "jobs by this business" queries

**Derivation rules (no extra columns):**
- Region — joined from `businesses.region_id` at query time. No denormalisation.
- Category — same. Not used as a filter in MVP, available for later.
- "Active" predicate — `status = 'open' AND expires_at > now() AND closed_at IS NULL`. Used everywhere on public surfaces.

**Cascade rationale:** if a business is deleted, its jobs should not remain visible. `onDelete: 'cascade'` matches that intent.

---

## Routes / pages

### Public

| Route | Purpose |
|---|---|
| `/jobs` | Index. Filters via URL params: `?region=`, `?type=`, `?q=`. Reverse-chron list of active jobs, capped at 50 (no pagination UI in v1). |
| `/jobs/[id]` | Job detail. Full description, embedded `<BusinessCard>` for the posting business, `<ApplyButton>`. Indexable. |

### Authed (claimed-owner only)

| Route | Purpose |
|---|---|
| `/dashboard/jobs` | Owner's jobs grouped by status: open / closed / expired. |
| `/dashboard/jobs/new` | Create form (`<JobForm>`). |
| `/dashboard/jobs/[id]/edit` | Edit form (`<JobForm>`) + "Close job" button. |

### Server actions

`app/dashboard/jobs/actions.ts` exposes:
- `createJob(input)`
- `updateJob(id, input)`
- `closeJob(id)`

Each verifies the user holds an approved `business_claims` row for the relevant `business_id` (see Authorization below). No new public REST routes — the public list/detail pages do their own server-side DB reads.

### Apply flow

`<ApplyButton>` is a client component on `/jobs/[id]`:
- **Signed in:** clicking opens `mailto:<apply_email>` or `<apply_url>` directly (`window.open` for URLs, `location.href` for mailto).
- **Signed out:** clicking redirects to `/auth/sign-in?next=/jobs/[id]?apply=1`. After successful sign-in, the existing `?next=` redirect lands them back on the job; the `?apply=1` param triggers the apply action automatically (one-shot, then param is removed via `router.replace`).

---

## Components

All new components are top-level in `components/` (PascalCase, single-file, no subdirectories — matches existing convention).

| Component | Where used | Purpose |
|---|---|---|
| `JobCard.tsx` | `/jobs` index, business detail page | Title, business name, region, employment-type chip, salary if present, posted-date. Links to `/jobs/[id]`. |
| `JobFilters.tsx` | `/jobs` index | Region select + employment-type select + keyword input. Updates URL params; index page re-reads server-side. |
| `JobForm.tsx` | `new` + `edit` dashboard pages | Shared form. Fields per the schema. Owns the "URL or email, exactly one" client-side validation (server re-validates). |
| `ApplyButton.tsx` | `/jobs/[id]` | Client. Auth-gated apply. |
| `JobStatusBadge.tsx` | dashboard list | "Open / Closed / Expired" pill. |

**Reused as-is:**
- `<BusinessCard>` — embedded on `/jobs/[id]` to show the posting business.
- `RouteProgress`, `SearchBar` patterns, `btn-primary` / `btn-ghost` styles.
- Existing dashboard chrome around `/dashboard/jobs`.

---

## Integration points

### `components/Nav.tsx`
Add a top-level "Jobs" link next to the existing nav items. Visible to everyone.

### `app/business/[slug]/`
If the business has any active jobs, render a "Jobs at this business" section below the main content with `<JobCard>`s. Zero active jobs → section hidden (no empty state on public pages).

### `app/dashboard/page.tsx`
Add a "Jobs" tab/card alongside the existing edit-business surface. Shows the owner's open-job count and links to `/dashboard/jobs`.

### `components/HeroCarousel.tsx`
No change in v1.

### `app/sitemap.ts`
- Add static entry for `/jobs`.
- Iterate active jobs and add each `/jobs/[id]` with `lastmod = postedAt`.

### `app/robots.ts`
No change. Public job pages are crawlable by default; dashboard routes are already excluded under existing rules — verify during implementation.

### `app/auth/sign-in/`
No code change. Existing `?next=` redirect supports the apply-flow round-trip.

### `app/admin/`
No new admin surface in v1. (Auto-publish, no moderation queue.)

---

## Authorization

Every job mutation (`createJob`, `updateJob`, `closeJob`) re-derives ownership server-side. Client-supplied IDs are never trusted.

**Create:**
```
business_claims WHERE user_id = session.userId
                  AND business_id = input.business_id
                  AND status = 'approved'
```
If no row → 403.

**Update / close:**
1. Load the `jobs` row by its ID. If not found → 404.
2. Check the user has an approved claim for that job's `business_id` (same query as above). If not → 403.

This blocks the "edit someone else's job by guessing the ID" attack. A revoked claim takes effect immediately for new mutations; existing live jobs stay published until they expire (acceptable for v1 — admin can take down via DB if needed).

---

## Validation

Server-side validation is authoritative; client-side mirrors it for UX.

| Field | Rule |
|---|---|
| `title` | 1–120 chars |
| `description` | 1–5000 chars |
| `employment_type` | one of `full_time` / `part_time` / `casual` / `contract` |
| `apply_url` | optional; if present must match `^https?://` |
| `apply_email` | optional; if present must look like an email (basic regex) |
| apply pair | exactly one of `apply_url` / `apply_email` set |
| `salary` | optional, ≤ 60 chars |

Schema enforces the apply-pair rule via a CHECK constraint:

```sql
CHECK (
  (apply_url IS NOT NULL AND apply_email IS NULL)
  OR (apply_url IS NULL AND apply_email IS NOT NULL)
)
```

---

## Public list query

Single query, server-rendered:

```ts
// pseudocode
SELECT jobs.*, businesses.name, businesses.slug, regions.name AS region_name, regions.slug AS region_slug
FROM jobs
JOIN businesses ON businesses.id = jobs.business_id
LEFT JOIN regions ON regions.id = businesses.region_id
WHERE jobs.status = 'open'
  AND jobs.expires_at > now()
  AND jobs.closed_at IS NULL
  AND (?region IS NULL OR regions.slug = ?region)
  AND (?type   IS NULL OR jobs.employment_type = ?type)
  AND (?q      IS NULL OR jobs.title ILIKE '%' || ?q || '%')
ORDER BY jobs.posted_at DESC
LIMIT 50
```

Hard cap at 50 — no pagination UI in v1. If we routinely hit the cap we'll add cursor pagination later.

---

## Edge cases

- **Apply method missing on a saved job** — schema disallows it. Defensive UI: if both fields are somehow null, render a disabled apply button (no crash).
- **Owner's claim revoked after posting** — auth check on every mutation handles this; existing live jobs remain published until expiry.
- **Business deleted** — FK cascade removes the jobs.
- **Time zones** — store all timestamps as UTC; expiry math is `postedAt + 60d` in UTC, no local-time gymnastics.
- **Stale job in cache** — `/jobs` and `/jobs/[id]` are dynamic (server actions invalidate as needed). No ISR in v1.
- **Apply URL points to a malicious site** — out of scope for v1 (claim is the trust gate); add reporting if abuse appears.

---

## Testing

Lean — match whatever the rest of the project does. If there's a Playwright suite, smoke-test the happy path; otherwise just manual verification.

**Unit (server actions):**
- Owner can create / update / close their own business's jobs.
- Non-owner gets 403 trying to create or update jobs for a business they haven't claimed.
- Owner can't update a job belonging to a different business they have *also* claimed unless the action targets that business.

**Smoke (manual or Playwright):**
1. Sign in as a claimed owner → create a job → see it on `/jobs` and on the business page.
2. Sign out → click into the job → click Apply → redirected to sign-in → after sign-in, apply target opens.
3. Filter `/jobs` by region and by type — list updates.
4. Owner clicks "Close job" → job disappears from public surfaces, shows in dashboard "Closed" tab.
5. Manually backdate a job's `expires_at` to the past in the DB → job disappears from public surfaces, shows in dashboard "Expired" tab.

---

## Implementation order (suggested for the plan)

1. Schema migration (`jobs` table + indexes + CHECK).
2. Server actions + authorization helpers.
3. Dashboard CRUD pages + `JobForm`.
4. Public `/jobs` index + filters + `JobCard` + `JobFilters`.
5. Public `/jobs/[id]` detail + `ApplyButton` + sign-in round-trip.
6. Business-detail page integration.
7. Nav link + dashboard card.
8. Sitemap entries.
9. Smoke verification.
