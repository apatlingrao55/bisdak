import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyOTP } from '@/lib/otp'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const code = (formData.get('code') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !code || !password) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const result = await verifyOTP(email, code, 'password-reset')
  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, email))
    .returning({ id: users.id })

  if (!updated) {
    return Response.json({ error: 'Account not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
