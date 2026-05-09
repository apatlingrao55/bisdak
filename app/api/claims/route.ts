import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses, businessClaims, users, emailVerifications } from '@/lib/db/schema'
import { eq, and, isNull, gt, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { verifyOTP } from '@/lib/otp'
import { notifyAdmin } from '@/lib/notify'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.emailVerified) {
    return Response.json({ error: 'Email not verified' }, { status: 403 })
  }

  const formData = await request.formData()
  const businessId = (formData.get('businessId') as string)?.trim()
  const message = (formData.get('message') as string)?.trim().slice(0, 500) || null
  const otpCode = (formData.get('otpCode') as string)?.trim()

  if (!businessId) {
    return Response.json({ error: 'businessId is required' }, { status: 400 })
  }

  // Verify claiming OTP
  if (!otpCode) {
    return Response.json({ error: 'OTP code is required for claiming' }, { status: 400 })
  }

  const otpResult = await verifyOTP(session.user.email!, otpCode, 'claiming')
  if (otpResult.error) {
    return Response.json({ error: otpResult.error }, { status: 400 })
  }

  const [biz] = await db
    .select({ id: businesses.id, name: businesses.name, email: businesses.email, ownerId: businesses.ownerId })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  if (!biz) {
    return Response.json({ error: 'Business not found' }, { status: 404 })
  }

  if (biz.ownerId) {
    return Response.json({ error: 'Business already claimed' }, { status: 409 })
  }

  // Check for existing pending claim from this user
  const [existingClaim] = await db
    .select({ id: businessClaims.id })
    .from(businessClaims)
    .where(and(
      eq(businessClaims.userId, session.user.id),
      eq(businessClaims.businessId, businessId),
      eq(businessClaims.status, 'pending'),
    ))
    .limit(1)

  if (existingClaim) {
    return Response.json({ error: 'You already have a pending claim for this business' }, { status: 409 })
  }

  // Get user email for matching
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const emailMatch = !!(biz.email && user?.email && biz.email.toLowerCase() === user.email.toLowerCase())

  if (emailMatch) {
    // Auto-approve: atomic update with WHERE owner_id IS NULL to prevent race condition
    const result = await db
      .update(businesses)
      .set({ ownerId: session.user.id })
      .where(and(
        eq(businesses.id, businessId),
        isNull(businesses.ownerId),
      ))
      .returning({ id: businesses.id })

    if (result.length === 0) {
      return Response.json({ error: 'Business already claimed' }, { status: 409 })
    }

    // Record the approved claim
    await db.insert(businessClaims).values({
      userId: session.user.id,
      businessId,
      status: 'approved',
      message,
    })

    const referer = request.headers.get('referer')
    if (referer) {
      return Response.redirect(new URL('/dashboard', request.url), 302)
    }
    return Response.json({ status: 'approved' })
  }

  // No email match — create pending claim for admin review
  await db.insert(businessClaims).values({
    userId: session.user.id,
    businessId,
    status: 'pending',
    message,
  })

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  notifyAdmin(
    'New Business Claim',
    `<p><strong>${esc(session.user.email!)}</strong> wants to claim <strong>${esc(biz.name)}</strong>.</p>
     ${message ? `<p>Message: &quot;${esc(message)}&quot;</p>` : ''}
     <p><a href="https://bisdak.co.nz/admin">Review in admin panel</a></p>`
  )

  const referer = request.headers.get('referer')
  if (referer) {
    return Response.redirect(new URL('/dashboard?claimed=pending', request.url), 302)
  }
  return Response.json({ status: 'pending' })
}
