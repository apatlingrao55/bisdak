import { auth } from './auth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')

  // Check admin using hashed cookie (middleware can't use next/headers cookies())
  const adminToken = process.env.ADMIN_TOKEN?.trim()
  const sessionCookie = req.cookies.get('admin_session')?.value ?? ''
  let adminAuth = false
  if (adminToken && sessionCookie) {
    const expected = crypto.createHash('sha256').update(adminToken).digest('hex')
    const a = Buffer.from(sessionCookie)
    const b = Buffer.from(expected)
    adminAuth = a.length === b.length && crypto.timingSafeEqual(a, b)
  }

  if (isDashboard && !isLoggedIn && !adminAuth) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  // Redirect unverified users to /auth/verify
  if (isDashboard && isLoggedIn && !adminAuth && !req.auth?.user?.emailVerified) {
    const email = req.auth?.user?.email
    if (email) {
      return NextResponse.redirect(
        new URL(`/auth/verify?email=${encodeURIComponent(email)}`, req.url)
      )
    }
  }
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
