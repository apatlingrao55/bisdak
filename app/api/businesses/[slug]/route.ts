import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getBusinessBySlug } from '@/lib/db/queries'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const biz = await getBusinessBySlug(slug)
  if (!biz) return Response.json({ error: 'Not found' }, { status: 404 })

  const bizReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.businessId, biz.id))

  return Response.json({ ...biz, reviews: bizReviews })
}
