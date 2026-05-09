import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businessClaims, businesses } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

function isAuthorized(req: NextRequest): boolean {
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()
  if (!adminToken) return false
  const cookieToken = req.cookies.get('admin_session')?.value ?? ''
  return cookieToken === adminToken
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return Response.redirect(new URL('/admin?error=unauthorized', request.url))
  }

  const { id } = await params
  const formData = await request.formData()
  const status = formData.get('status') as string

  if (!['approved', 'rejected'].includes(status)) {
    return Response.redirect(new URL('/admin?error=invalid', request.url))
  }

  const [claim] = await db
    .select()
    .from(businessClaims)
    .where(eq(businessClaims.id, id))
    .limit(1)

  if (!claim) {
    return Response.redirect(new URL('/admin?error=not-found', request.url))
  }

  if (status === 'approved') {
    // Atomic: only set ownerId if still unclaimed
    await db
      .update(businesses)
      .set({ ownerId: claim.userId })
      .where(and(
        eq(businesses.id, claim.businessId),
        isNull(businesses.ownerId),
      ))
  }

  await db
    .update(businessClaims)
    .set({ status: status as 'approved' | 'rejected' })
    .where(eq(businessClaims.id, id))

  return Response.redirect(new URL('/admin', request.url), 302)
}
