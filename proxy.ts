import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAdmin = req.cookies.get('admin_session')?.value === (process.env.ADMIN_TOKEN ?? '').trim()
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')

  if (isDashboard && !isLoggedIn && !isAdmin) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  // Redirect unverified users to /auth/verify
  if (isDashboard && isLoggedIn && !isAdmin && !req.auth?.user?.emailVerified) {
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
