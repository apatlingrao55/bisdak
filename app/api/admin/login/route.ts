import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const data = await req.formData()
  const token = (data.get('token') as string ?? '').trim()
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()

  if (!token || !adminToken) {
    return NextResponse.redirect(new URL('/admin?error=1', req.url))
  }

  // Timing-safe comparison
  const a = Buffer.from(token)
  const b = Buffer.from(adminToken)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.redirect(new URL('/admin?error=1', req.url))
  }

  // Store hashed token in cookie, not the raw secret
  const hashedSession = crypto.createHash('sha256').update(adminToken).digest('hex')

  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.cookies.set('admin_session', hashedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
