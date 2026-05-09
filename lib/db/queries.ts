import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq, and, like, or, desc, asc, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

/** Full business by slug (active only) — used by detail page, API route, OG endpoint */
export async function getBusinessBySlug(slug: string) {
  const [biz] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      phone: businesses.phone,
      email: businesses.email,
      website: businesses.website,
      facebookUrl: businesses.facebookUrl,
      googleMapsUrl: businesses.googleMapsUrl,
      isFilipino: businesses.isFilipino,
      photoUrl: businesses.photoUrl,
      openStatus: businesses.openStatus,
      ownerId: businesses.ownerId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryIcon: categories.icon,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(and(eq(businesses.slug, slug), eq(businesses.status, 'active')))
    .limit(1)
  return biz ?? null
}

/** Card-shaped projection with aggregates — used by homepage, search */
export async function getBusinessCards(options?: {
  limit?: number
  conditions?: SQL[]
  orderBy?: 'newest' | 'alpha'
}) {
  const { limit, conditions = [], orderBy = 'newest' } = options ?? {}

  const allConditions: SQL[] = [eq(businesses.status, 'active') as SQL, ...conditions]

  const order = orderBy === 'alpha' ? asc(businesses.name) : desc(businesses.createdAt)

  let query = db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      isFilipino: businesses.isFilipino,
      openStatus: businesses.openStatus,
      photoUrl: businesses.photoUrl,
      phone: businesses.phone,
      email: businesses.email,
      website: businesses.website,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      regionName: regions.name,
      avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      reviewCount: sql<number>`COUNT(${reviews.id})`,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .leftJoin(reviews, eq(reviews.businessId, businesses.id))
    .where(and(...allConditions))
    .groupBy(businesses.id, categories.name, categories.icon, regions.name)
    .orderBy(order)
    .$dynamic()

  if (limit) {
    query = query.limit(limit)
  }

  return query
}
