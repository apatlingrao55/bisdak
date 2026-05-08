import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const data = await req.formData()
  const token = (data.get('token') as string ?? '').trim()
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()

  if (!token || !adminToken || token !== adminToken) {
    return NextResponse.redirect(new URL('/admin?error=1', req.url))
  }

  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
