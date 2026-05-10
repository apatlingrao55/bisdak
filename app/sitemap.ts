export const revalidate = 3600

import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { businesses, posts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/tools`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/tools/mortgage`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/paye`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/gst`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/currency`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/time-zone`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/timer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const businessRoutes: MetadataRoute.Sitemap = allBusinesses.map(b => ({
    url: `${BASE}/business/${b.slug}`,
    lastModified: b.createdAt ?? new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const postRoutes: MetadataRoute.Sitemap = allPosts.map(p => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.publishedAt ?? new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...businessRoutes, ...postRoutes]
}
