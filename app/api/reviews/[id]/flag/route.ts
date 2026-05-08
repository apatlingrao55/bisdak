import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.update(reviews).set({ isFlagged: true }).where(eq(reviews.id, id))
  const referer = request.headers.get('referer') ?? '/'
  return Response.redirect(referer, 302)
}
