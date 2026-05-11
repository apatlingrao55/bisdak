import { NextRequest } from 'next/server'

export function ipFromRequest(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (!xff) return 'unknown'
  return xff.split(',')[0].trim() || 'unknown'
}
