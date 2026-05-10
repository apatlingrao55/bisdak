import { db } from '@/lib/db'
import { jobs, businesses, regions, businessClaims } from '@/lib/db/schema'
import { and, desc, eq, gt, ilike, isNull, sql } from 'drizzle-orm'

export type JobListFilters = {
  regionSlug?: string | null
  employmentType?: string | null
  q?: string | null
}

export async function listActiveJobs(filters: JobListFilters = {}) {
  const conditions = [eq(jobs.status, 'open' as const), gt(jobs.expiresAt, sql`now()`), isNull(jobs.closedAt)]
  if (filters.regionSlug) conditions.push(eq(regions.slug, filters.regionSlug))
  if (filters.employmentType) conditions.push(eq(jobs.employmentType, filters.employmentType as 'full_time'))
  if (filters.q) conditions.push(ilike(jobs.title, `%${filters.q}%`))

  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      employmentType: jobs.employmentType,
      salary: jobs.salary,
      postedAt: jobs.postedAt,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      regionName: regions.name,
      regionSlug: regions.slug,
    })
    .from(jobs)
    .innerJoin(businesses, eq(businesses.id, jobs.businessId))
    .leftJoin(regions, eq(regions.id, businesses.regionId))
    .where(and(...conditions))
    .orderBy(desc(jobs.postedAt))
    .limit(50)
}

export async function getActiveJobById(id: string) {
  const [row] = await db
    .select({
      job: jobs,
      business: businesses,
      regionName: regions.name,
    })
    .from(jobs)
    .innerJoin(businesses, eq(businesses.id, jobs.businessId))
    .leftJoin(regions, eq(regions.id, businesses.regionId))
    .where(and(eq(jobs.id, id), eq(jobs.status, 'open'), gt(jobs.expiresAt, sql`now()`), isNull(jobs.closedAt)))
    .limit(1)
  return row ?? null
}

export async function listActiveJobsForBusiness(businessId: string) {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      employmentType: jobs.employmentType,
      salary: jobs.salary,
      postedAt: jobs.postedAt,
    })
    .from(jobs)
    .where(and(eq(jobs.businessId, businessId), eq(jobs.status, 'open'), gt(jobs.expiresAt, sql`now()`), isNull(jobs.closedAt)))
    .orderBy(desc(jobs.postedAt))
}

export async function listJobsForOwner(userId: string) {
  // All jobs across all businesses the user has approved claims on.
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      postedAt: jobs.postedAt,
      expiresAt: jobs.expiresAt,
      closedAt: jobs.closedAt,
      businessId: jobs.businessId,
      businessName: businesses.name,
    })
    .from(jobs)
    .innerJoin(businesses, eq(businesses.id, jobs.businessId))
    .innerJoin(
      businessClaims,
      and(eq(businessClaims.businessId, businesses.id), eq(businessClaims.userId, userId), eq(businessClaims.status, 'approved')),
    )
    .orderBy(desc(jobs.postedAt))
}
