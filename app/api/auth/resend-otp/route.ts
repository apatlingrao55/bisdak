import { NextRequest } from 'next/server'
import { createAndSendOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    // Always return same response to prevent email enumeration
    return Response.json({ success: true })
  }

  const result = await createAndSendOTP(email, 'registration')

  if (result.error) {
    return Response.json({ error: result.error }, { status: 429 })
  }

  // Always return same response to prevent email enumeration
  return Response.json({ success: true })
}
