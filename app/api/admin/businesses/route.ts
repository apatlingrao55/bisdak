import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { businesses, reviews, businessClaims } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value ?? ''
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()
  return !!adminToken && session === adminToken
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await request.json()
  if (!id) {
    return new Response('Business ID required', { status: 400 })
  }

  // Delete related records first (foreign key constraints)
  await db.delete(reviews).where(eq(reviews.businessId, id))
  await db.delete(businessClaims).where(eq(businessClaims.businessId, id))
  await db.delete(businesses).where(eq(businesses.id, id))

  return Response.json({ success: true })
}
