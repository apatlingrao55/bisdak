import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createAndSendOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const agreeTerms = formData.get('agreeTerms') as string

  if (!name || !email || !password || agreeTerms !== 'yes') {
    return Response.redirect(new URL('/auth/sign-up?error=missing', request.url))
  }

  if (password.length < 8) {
    return Response.redirect(new URL('/auth/sign-up?error=password', request.url))
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    return Response.redirect(new URL('/auth/sign-up?error=exists', request.url))
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.insert(users).values({
    email,
    name,
    passwordHash,
  })

  await createAndSendOTP(email, 'registration')

  return Response.redirect(
    new URL(`/auth/verify?email=${encodeURIComponent(email)}`, request.url)
  )
}
