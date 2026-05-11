import { db } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'

const CLEANUP_PROBABILITY = 1 / 50

export async function rateLimit(opts: {
  ip: string
  route: string
  max: number
  windowSec: number
}): Promise<{ ok: boolean; remaining: number }> {
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
    void db.delete(rateLimits).where(lt(rateLimits.ts, sql`now() - interval '1 day'`))
  }

  return { ok, remaining }
}
