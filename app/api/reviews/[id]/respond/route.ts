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
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params
  const formData = await request.formData()
  const response = (formData.get('response') as string)?.trim()

  if (!response) {
    return new Response('Response text is required', { status: 400 })
  }

  await db
    .update(reviews)
    .set({ ownerResponse: response.slice(0, 500) })
    .where(eq(reviews.id, id))

  const referer = request.headers.get('referer') ?? '/dashboard'
  return Response.redirect(referer, 302)
}
