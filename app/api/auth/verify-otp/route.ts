import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string)?.trim()
  const code = (formData.get('code') as string)?.trim()

  if (!email || !code) {
    return Response.json({ error: 'Email and code are required.' }, { status: 400 })
  }

  const result = await verifyOTP(email, code, 'registration')

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  // Mark user as verified
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, email))

  return Response.json({ success: true })
}
