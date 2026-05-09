import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { reviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Sign in to flag a review', { status: 401 })
  }

  const { id } = await params
  await db.update(reviews).set({ isFlagged: true }).where(eq(reviews.id, id))

  const referer = request.headers.get('referer')
  if (referer && referer.startsWith(new URL('/', request.url).origin)) {
    return Response.redirect(referer, 302)
  }
  return Response.redirect(new URL('/', request.url), 302)
}
