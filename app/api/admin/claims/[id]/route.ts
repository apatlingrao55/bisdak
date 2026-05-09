import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businessClaims, businesses } from '@/lib/db/schema'
import { eq, and, isNull, ne } from 'drizzle-orm'
import { isAdmin } from '@/lib/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
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

    // Auto-reject other pending claims for the same business
    await db
      .update(businessClaims)
      .set({ status: 'rejected' })
      .where(and(
        eq(businessClaims.businessId, claim.businessId),
        eq(businessClaims.status, 'pending'),
        ne(businessClaims.id, id),
      ))
  }

  await db
    .update(businessClaims)
    .set({ status: status as 'approved' | 'rejected' })
    .where(eq(businessClaims.id, id))

  return Response.redirect(new URL('/admin', request.url), 302)
}
