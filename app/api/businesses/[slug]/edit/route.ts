import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { slug } = await params

  // Load business and verify ownership
  const [biz] = await db
    .select({ id: businesses.id, ownerId: businesses.ownerId })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)

  if (!biz) {
    return new Response('Not found', { status: 404 })
  }

  if (biz.ownerId !== session.user.id) {
    return new Response('Forbidden', { status: 403 })
  }

  const formData = await request.formData()

  // Whitelist + validate fields
  const name = (formData.get('name') as string)?.trim().slice(0, 200)
  if (!name) {
    return new Response('Name is required', { status: 400 })
  }

  const description = (formData.get('description') as string)?.trim().slice(0, 500) || null
  const phone = (formData.get('phone') as string)?.trim().slice(0, 30) || null
  const email = (formData.get('email') as string)?.trim().slice(0, 100) || null
  const website = (formData.get('website') as string)?.trim().slice(0, 500) || null
  const facebookUrl = (formData.get('facebookUrl') as string)?.trim().slice(0, 500) || null
  const googleMapsUrl = (formData.get('googleMapsUrl') as string)?.trim().slice(0, 500) || null
  const photoUrl = (formData.get('photoUrl') as string)?.trim().slice(0, 500) || null
  const openStatusRaw = (formData.get('openStatus') as string)?.trim() || null
  const openStatus = openStatusRaw === 'open' || openStatusRaw === 'closed' ? openStatusRaw : null

  // Validate formats
  if (email && !isValidEmail(email)) {
    return new Response('Invalid email format', { status: 400 })
  }
  if (website && !isValidUrl(website)) {
    return new Response('Website must be a valid HTTPS URL', { status: 400 })
  }
  if (facebookUrl && !isValidUrl(facebookUrl)) {
    return new Response('Facebook URL must be a valid HTTPS URL', { status: 400 })
  }
  if (googleMapsUrl && !isValidUrl(googleMapsUrl)) {
    return new Response('Google Maps URL must be a valid HTTPS URL', { status: 400 })
  }
  if (photoUrl && !isValidUrl(photoUrl)) {
    return new Response('Photo URL must be a valid HTTPS URL', { status: 400 })
  }

  // Defense-in-depth: ownership check in WHERE clause
  await db
    .update(businesses)
    .set({ name, description, phone, email, website, facebookUrl, googleMapsUrl, photoUrl, openStatus })
    .where(and(eq(businesses.id, biz.id), eq(businesses.ownerId, session.user.id)))

  const referer = request.headers.get('referer') ?? '/dashboard'
  return Response.redirect(new URL('/dashboard', request.url), 302)
}
