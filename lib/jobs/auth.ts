import { db } from '@/lib/db'
import { businessClaims, jobs } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Returns true iff the user has an approved claim on the given business.
 * Single source of truth for "can this user manage this business's jobs".
 */
export async function userOwnsBusiness(userId: string, businessId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: businessClaims.id })
    .from(businessClaims)
    .where(
      and(
        eq(businessClaims.userId, userId),
        eq(businessClaims.businessId, businessId),
        eq(businessClaims.status, 'approved'),
      ),
    )
    .limit(1)
  return !!row
}

/**
 * Loads the job and verifies the user owns its business.
 * Returns the job row on success, or null if not found / not authorized.
 */
export async function getJobIfOwner(userId: string, jobId: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1)
  if (!job) return null
  const ok = await userOwnsBusiness(userId, job.businessId)
  return ok ? job : null
}
