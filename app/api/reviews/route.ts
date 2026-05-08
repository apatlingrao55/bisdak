import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const businessId = formData.get('businessId') as string
  const reviewerName = formData.get('reviewerName') as string
  const suburb = formData.get('suburb') as string
  const ratingRaw = formData.get('rating') as string
  const body = formData.get('body') as string

  if (!businessId || !reviewerName?.trim() || !suburb?.trim() || !ratingRaw || !body?.trim()) {
    return new Response('Missing required fields', { status: 400 })
  }

  const rating = parseInt(ratingRaw)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return new Response('Rating must be 1–5', { status: 400 })
  }
  if (body.length > 300) {
    return new Response('Review body exceeds 300 characters', { status: 400 })
  }

  await db.insert(reviews).values({
    businessId,
    reviewerName: reviewerName.trim().slice(0, 100),
    suburb: suburb.trim().slice(0, 100),
    rating,
    body: body.trim().slice(0, 300),
  })

  const [biz] = await db
    .select({ slug: businesses.slug })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  const slug = biz?.slug ?? ''
  return Response.redirect(new URL(`/business/${slug}`, request.url))
}
