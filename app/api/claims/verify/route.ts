import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createAndSendOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.emailVerified) {
    return Response.json({ error: 'Email not verified' }, { status: 403 })
  }

  const result = await createAndSendOTP(session.user.email, 'claiming')

  if (result.error) {
    return Response.json({ error: result.error }, { status: 429 })
  }

  return Response.json({ success: true })
}
