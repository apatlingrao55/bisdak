import { auth } from './auth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { ipFromRequest } from '@/lib/request'
import { rateLimit } from '@/lib/rate-limit'

const GOOD_BOT_RE = /(googlebot|bingbot|duckduckbot|slurp|twitterbot|linkedinbot|facebookexternalhit|applebot)/i
const BAD_TOOL_RE = /^(curl|wget|python-requests|python-urllib|scrapy|httpx|go-http-client|java\/|ruby|node-fetch)/i

const ROUTE_LIMITS: Array<{ test: (path: string, method: string) => boolean; key: string; max: number; windowSec: number }> = [
  { test: (p, m) => m === 'POST' && /^\/api\/businesses\/[^/]+\/contact$/.test(p), key: 'contact:min', max: 10, windowSec: 60 },
  { test: (p) => p === '/search', key: 'search', max: 60, windowSec: 60 },
  { test: (p) => p === '/jobs', key: 'jobs', max: 60, windowSec: 60 },
  { test: (p, m) => m === 'POST' && p === '/api/jobs', key: 'jobs:create', max: 10, windowSec: 3600 },
  { test: (p, m) => m === 'POST' && p === '/api/submit', key: 'submit', max: 5, windowSec: 3600 },
]

function block(reason: string, status: number) {
  console.warn(`[scraper-defense] block: ${reason} (status ${status})`)
  return new NextResponse(reason === 'rate-limit' ? 'Rate limited, try again later' : 'Blocked', { status })
}

// Paths that need scraper-defense (UA filter + rate limit). Matcher below also
// admits /dashboard/* for the auth flow, but those should skip scraper-defense.
const SCRAPER_DEFENSE_PATHS: Array<(path: string, method: string) => boolean> = [
  (p, m) => m === 'POST' && /^\/api\/businesses\/[^/]+\/contact$/.test(p),
  (p) => p === '/search',
  (p) => p === '/jobs',
  (p, m) => m === 'POST' && p === '/api/jobs',
  (p, m) => m === 'POST' && p === '/api/submit',
]

export default auth(async (req) => {
  const path = req.nextUrl.pathname
  const method = req.method

  // ── Scraper defense (only for the public/api routes listed above) ────────
  if (SCRAPER_DEFENSE_PATHS.some((t) => t(path, method))) {
    const ua = req.headers.get('user-agent') ?? ''

    // 1. Verified search engines pass.
    if (!GOOD_BOT_RE.test(ua)) {
      // 2. Reject blatant tooling.
      if (BAD_TOOL_RE.test(ua)) return block('blacklisted-ua', 403)

      // 3. Reject malformed requests (real browsers always send these).
      if (!req.headers.get('accept')) return block('missing-accept', 403)
      if (!req.headers.get('accept-language')) return block('missing-accept-language', 403)

      // 4. Apply rate limit if route matches.
      const limit = ROUTE_LIMITS.find((r) => r.test(path, method))
      if (limit) {
        const ip = ipFromRequest(req)
        const result = await rateLimit({ ip, route: limit.key, max: limit.max, windowSec: limit.windowSec })
        if (!result.ok) return block('rate-limit', 429)
      }
    }
  }

  // ── Dashboard auth gating ────────────────────────────────────────────────
  const isLoggedIn = !!req.auth
  const isDashboard = path.startsWith('/dashboard')

  // Check admin using hashed cookie (proxy can't use next/headers cookies())
  const adminToken = process.env.ADMIN_TOKEN?.trim()
  const sessionCookie = req.cookies.get('admin_session')?.value ?? ''
  let adminAuth = false
  if (adminToken && sessionCookie) {
    const expected = crypto.createHash('sha256').update(adminToken).digest('hex')
    const a = Buffer.from(sessionCookie)
    const b = Buffer.from(expected)
    adminAuth = a.length === b.length && crypto.timingSafeEqual(a, b)
  }

  if (isDashboard && !isLoggedIn && !adminAuth) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  // Redirect unverified users to /auth/verify
  if (isDashboard && isLoggedIn && !adminAuth && !req.auth?.user?.emailVerified) {
    const email = req.auth?.user?.email
    if (email) {
      return NextResponse.redirect(
        new URL(`/auth/verify?email=${encodeURIComponent(email)}`, req.url)
      )
    }
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/businesses/:slug/contact',
    '/search',
    '/jobs',
    '/api/jobs',
    '/api/submit',
  ],
}
