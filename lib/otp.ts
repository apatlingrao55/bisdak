import { db } from '@/lib/db'
import { emailVerifications } from '@/lib/db/schema'
import { eq, and, gt, sql } from 'drizzle-orm'
import { generateOTP, hashOTP, verifyOTPHash, sendOTPEmail } from '@/lib/email'

export async function createAndSendOTP(email: string, purpose: 'registration' | 'claiming' | 'password-reset') {
  // Rate limit: max 3 per email per hour (includes initial send)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        gt(emailVerifications.createdAt, oneHourAgo)
      )
    )

  if (recentCount[0].count >= 3) {
    return { error: 'Too many requests. Try again later.' }
  }

  // Invalidate all previous unused codes for this email+purpose
  await db
    .update(emailVerifications)
    .set({ used: true })
    .where(
      and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.purpose, purpose),
        eq(emailVerifications.used, false)
      )
    )

  const { code, hash } = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await db.insert(emailVerifications).values({
    email,
    codeHash: hash,
    purpose,
    expiresAt,
  })

  await sendOTPEmail(email, code)
  return { success: true }
}

export async function verifyOTP(
  email: string,
  code: string,
  purpose: 'registration' | 'claiming' | 'password-reset'
) {
  const now = new Date()

  // Find the latest unused, non-expired OTP for this email+purpose
  const [record] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.purpose, purpose),
        eq(emailVerifications.used, false),
        gt(emailVerifications.expiresAt, now)
      )
    )
    .orderBy(sql`created_at DESC`)
    .limit(1)

  if (!record) {
    return { error: 'No active code. Request a new one.' }
  }

  // Check max attempts (5) before comparing
  if (record.attempts! >= 5) {
    await db
      .update(emailVerifications)
      .set({ used: true })
      .where(eq(emailVerifications.id, record.id))
    return { error: 'Too many failed attempts. Request a new code.' }
  }

  // Timing-safe hash comparison
  const submittedHash = hashOTP(code)
  if (!verifyOTPHash(submittedHash, record.codeHash)) {
    await db
      .update(emailVerifications)
      .set({ attempts: sql`attempts + 1` })
      .where(eq(emailVerifications.id, record.id))

    const remaining = 4 - record.attempts!
    if (remaining <= 0) {
      await db
        .update(emailVerifications)
        .set({ used: true })
        .where(eq(emailVerifications.id, record.id))
      return { error: 'Too many failed attempts. Request a new code.' }
    }

    return { error: `Invalid code. ${remaining} attempt(s) remaining.` }
  }

  // Atomic consumption
  const [consumed] = await db
    .update(emailVerifications)
    .set({ used: true })
    .where(and(eq(emailVerifications.id, record.id), eq(emailVerifications.used, false)))
    .returning({ id: emailVerifications.id })

  if (!consumed) {
    return { error: 'Code already used. Request a new one.' }
  }

  return { success: true, verifiedAt: now }
}
