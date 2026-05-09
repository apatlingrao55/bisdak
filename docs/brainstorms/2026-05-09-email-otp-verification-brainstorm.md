---
date: 2026-05-09
topic: email-otp-verification
---

# Email OTP Verification

## What We're Building

Email verification via 6-digit OTP code at two points:

1. **At registration** — after signup, user must enter a 6-digit code sent to their email before the account is active. Unverified users are blocked from all actions (dashboard, reviews, claiming).
2. **At claiming** — when a user claims a business, they must re-verify their email via a new OTP before the claim is processed.

OTP delivery via **Resend** API (free tier: 100 emails/day).

## Why This Approach

- **Resend** — simple API, popular in Next.js ecosystem, free tier is plenty for current scale. No need to switch auth providers.
- **6-digit code** — familiar UX, no magic link complexity. Works on all devices.
- **Block everything until verified** — prevents fake accounts from polluting reviews or dashboard. Clean data from day one.
- **Re-verify at claiming** — extra security layer. Even if someone verified months ago, confirming they still control the email before a business claim is important.

## Key Decisions

- **OTP delivery**: Resend API
- **OTP format**: 6-digit numeric code
- **OTP expiry**: 10 minutes
- **Rate limiting**: Max 3 OTP requests per email per hour
- **Registration flow**: Signup -> redirect to /auth/verify -> enter OTP -> account activated
- **Claiming flow**: Click "Claim" -> OTP sent to user email -> enter code -> claim processed
- **Storage**: New `email_verifications` table (email, code hash, expires_at, created_at)
- **Schema change**: Add `emailVerified` boolean to `users` table (default false)
- **Blocked when unverified**: Dashboard, reviews, claiming — all require `emailVerified = true`
- **Middleware**: Update proxy.ts to check `emailVerified` and redirect to /auth/verify if false

## Security Mitigations

- **Brute force**: Max 5 failed attempts per OTP → invalidate and require new code
- **Email enumeration**: Always return same response regardless of email existence
- **OTP flooding**: 3 OTP requests/email/hour + 10 OTP requests/IP/hour
- **Claiming bypass**: Claim API verifies OTP was confirmed within last 5 minutes (server-side timestamp)
- **Race condition**: Atomic OTP consumption — `UPDATE WHERE used = false RETURNING id`
- **Code storage**: SHA-256 hash OTP codes in database, constant-time comparison
- **Old code reuse**: Validate `expires_at > NOW()` AND `used = false`, clean up expired records

## Open Questions

- Should the re-verification at claiming use the same registered email or allow a different one? (Leaning: same email, since it's tied to their account)

## Next Steps

-> `/workflows:plan` for implementation details
