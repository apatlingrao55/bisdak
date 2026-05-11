import { db } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'

const CLEANUP_PROBABILITY = 1 / 50

/**
 * Sliding-window per-IP-per-route rate limiter.
 *
 * Fail-open: if the DB is unreachable, returns `{ ok: true }` and logs.
 * The point is to not turn the rate limiter itself into a denial-of-service
 * vector when Postgres is degraded — we'd rather let scrapers through than
 * 500 every public page.
 */
export async function rateLimit(opts: {
  ip: string
  route: string
  max: number
  windowSec: number
}): Promise<{ ok: boolean; remaining: number }> {
  try {
    const since = sql`now() - (${String(opts.windowSec)} || ' seconds')::interval`

    await db.insert(rateLimits).values({ ip: opts.ip, route: opts.route })

    const [row] = await db
      .select({ n: count() })
      .from(rateLimits)
      .where(and(eq(rateLimits.ip, opts.ip), eq(rateLimits.route, opts.route), gt(rateLimits.ts, since)))

    const used = Number(row?.n ?? 0)
    const ok = used <= opts.max
    const remaining = Math.max(0, opts.max - used)

    if (Math.random() < CLEANUP_PROBABILITY) {
      db.delete(rateLimits)
        .where(lt(rateLimits.ts, sql`now() - interval '1 day'`))
        .catch((err) => console.warn('[rate-limit] cleanup failed', err))
    }

    return { ok, remaining }
  } catch (err) {
    console.warn('[rate-limit] failed open', { route: opts.route, err })
    return { ok: true, remaining: opts.max }
  }
}
