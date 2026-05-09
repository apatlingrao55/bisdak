import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import bcrypt from 'bcryptjs'
import { createAndSendOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const agreeTerms = formData.get('agreeTerms') as string

  if (!name || !email || !password || agreeTerms !== 'yes') {
    return Response.redirect(new URL('/auth/sign-up?error=missing', request.url))
  }

  if (password.length < 8) {
    return Response.redirect(new URL('/auth/sign-up?error=password', request.url))
  }

  const passwordHash = await bcrypt.hash(password, 12)

  // Use onConflictDoNothing to prevent race condition on duplicate email
  const result = await db.insert(users).values({
    email,
    name,
    passwordHash,
  }).onConflictDoNothing({ target: users.email }).returning({ id: users.id })

  if (result.length === 0) {
    return Response.redirect(new URL('/auth/sign-up?error=exists', request.url))
  }

  const otpResult = await createAndSendOTP(email, 'registration')

  if (otpResult.error) {
    return Response.redirect(new URL('/auth/sign-up?error=rate-limit', request.url))
  }

  return Response.redirect(
    new URL(`/auth/verify?email=${encodeURIComponent(email)}`, request.url)
  )
}
