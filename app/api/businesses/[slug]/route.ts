import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses, categories, regions, reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const [biz] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      description: businesses.description,
      phone: businesses.phone,
      website: businesses.website,
      facebookUrl: businesses.facebookUrl,
      googleMapsUrl: businesses.googleMapsUrl,
      isFilipino: businesses.isFilipino,
      photoUrl: businesses.photoUrl,
      openStatus: businesses.openStatus,
      status: businesses.status,
      categoryName: categories.name,
      regionName: regions.name,
    })
    .from(businesses)
    .leftJoin(categories, eq(businesses.categoryId, categories.id))
    .leftJoin(regions, eq(businesses.regionId, regions.id))
    .where(eq(businesses.slug, slug))
    .limit(1)

  if (!biz) return Response.json({ error: 'Not found' }, { status: 404 })

  const bizReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.businessId, biz.id))

  return Response.json({ ...biz, reviews: bizReviews })
}
