import crypto from 'crypto'
import { cookies } from 'next/headers'

/** Hash the admin token to avoid storing raw secret in cookie */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Timing-safe admin session check using hashed cookie value */
export async function isAdmin(): Promise<boolean> {
  const adminToken = process.env.ADMIN_TOKEN?.trim()
  if (!adminToken) return false

  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value ?? ''
  if (!session) return false

  const expected = hashToken(adminToken)
  const a = Buffer.from(session)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** Create a hashed session value for the admin cookie */
export function createAdminSessionValue(): string {
  const adminToken = process.env.ADMIN_TOKEN?.trim()
  if (!adminToken) throw new Error('ADMIN_TOKEN not configured')
  return hashToken(adminToken)
}
