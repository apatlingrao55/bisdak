---
date: 2026-05-09
topic: admin-rbac-business-claiming
---

# Admin Access & Business Claiming

## What We're Building

Two-tier access control for the BisDak directory:

1. **Business owners** can claim pre-seeded listings and edit all fields on their own business via the dashboard.
2. **Super admin** retains full access via the existing `ADMIN_TOKEN` cookie approach — no changes to admin auth.

A self-service claiming flow lets real business owners claim scraped listings. If the user's email matches the business email on file, the claim is auto-approved. Otherwise it goes to the super admin queue for manual review.

## Why This Approach

- **Keep ADMIN_TOKEN for super admin** — simplest, already works, only 1-2 people need it. No user-account-based roles needed.
- **Self-service claiming with email match** — reduces admin workload for obvious matches while keeping a manual review gate for unverified claims.
- **No role column on users** — ownership is determined by `ownerId` on the business table. Avoids permission system complexity.

## Key Decisions

- **Super admin auth unchanged**: `ADMIN_TOKEN` env var, cookie-based. Not tied to user accounts.
- **Business owner = user with ownerId match**: No roles table, no permissions. If `business.ownerId === session.user.id`, they can edit.
- **Claiming flow**: User clicks "Claim this business" → if email matches business email, auto-approve and set `ownerId`. If no match, create a `business_claims` record for admin review.
- **Edit scope**: Business owners can edit everything — name, description, phone, email, website, Facebook, Google Maps, photo, open status.
- **New DB table**: `business_claims` (id, userId, businessId, status, message, createdAt).
- **Admin panel addition**: "Pending Claims" section alongside existing submissions/reviews/posts.
- **Dashboard addition**: "Edit Business" form for owned listings.

## Open Questions

- Should edits by owners go live immediately or require admin approval? (Leaning: immediate for v1, moderation later if needed)
- Should we notify the owner via email when their claim is approved/rejected? (Leaning: not in v1)

## Next Steps

-> `/workflows:plan` for implementation details
