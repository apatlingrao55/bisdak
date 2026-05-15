export const revalidate = 3600

import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { businesses, posts, jobs, regions, categories } from '@/lib/db/schema'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'

const BASE = 'https://bisdak.co.nz'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allBusinesses = await db
    .select({ slug: businesses.slug, createdAt: businesses.createdAt })
    .from(businesses)
    .where(eq(businesses.status, 'active'))

  const allPosts = await db
    .select({ slug: posts.slug, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.status, 'published'))

  const allJobs = await db
    .select({ id: jobs.id, postedAt: jobs.postedAt })
    .from(jobs)
    .where(and(eq(jobs.status, 'open'), gt(jobs.expiresAt, sql`now()`), isNull(jobs.closedAt)))

  const allRegions = await db.select({ slug: regions.slug }).from(regions)
  const allCategories = await db.select({ slug: categories.slug }).from(categories)

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/jobs`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/mortgage`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/paye`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/gst`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/currency`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/time-zone`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/timer`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/verification`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = allCategories.map(c => ({
    url: `${BASE}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const regionRoutes: MetadataRoute.Sitemap = allRegions.map(r => ({
    url: `${BASE}/city/${r.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const businessRoutes: MetadataRoute.Sitemap = allBusinesses.map(b => ({
    url: `${BASE}/business/${b.slug}`,
    lastModified: b.createdAt ?? now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const postRoutes: MetadataRoute.Sitemap = allPosts.map(p => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.publishedAt ?? now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const jobRoutes: MetadataRoute.Sitemap = allJobs.map(j => ({
    url: `${BASE}/jobs/${j.id}`,
    lastModified: j.postedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...regionRoutes,
    ...businessRoutes,
    ...postRoutes,
    ...jobRoutes,
  ]
}
