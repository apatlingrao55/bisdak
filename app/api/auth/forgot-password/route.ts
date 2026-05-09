import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createAndSendOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) {
    return Response.redirect(new URL('/auth/forgot-password?error=missing', request.url))
  }

  // Check if user exists (but always show same response to prevent enumeration)
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (user) {
    const otpResult = await createAndSendOTP(email, 'password-reset')
    if (otpResult.error) {
      return Response.redirect(
        new URL('/auth/forgot-password?error=rate-limit', request.url)
      )
    }
  }

  // Always redirect to verify step (anti-enumeration)
  return Response.redirect(
    new URL(`/auth/reset-password?email=${encodeURIComponent(email)}`, request.url)
  )
}
