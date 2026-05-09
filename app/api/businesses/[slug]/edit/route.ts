import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value ?? ''
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()
  return !!adminToken && session === adminToken
}

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
  const admin = await isAdmin()
  const session = await auth()

  if (!admin && !session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { slug } = await params

  // Load business
  const [biz] = await db
    .select({ id: businesses.id, ownerId: businesses.ownerId })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)

  if (!biz) {
    return new Response('Not found', { status: 404 })
  }

  // Super admin can edit any business; owners can only edit their own
  if (!admin && biz.ownerId !== session?.user?.id) {
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
  const openStatusRaw = (formData.get('openStatus') as string)?.trim() || null
  const openStatus = openStatusRaw === 'open' || openStatusRaw === 'closed' ? openStatusRaw : null

  // Handle photo upload or keep existing
  let photoUrl: string | null = (formData.get('existingPhotoUrl') as string)?.trim() || null
  const photoFile = formData.get('photo') as File | null
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 5 * 1024 * 1024) {
      return new Response('Photo must be under 5MB', { status: 400 })
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(photoFile.type)) {
      return new Response('Photo must be JPEG, PNG, or WebP', { status: 400 })
    }
    const ext = photoFile.type.split('/')[1] === 'jpeg' ? 'jpg' : photoFile.type.split('/')[1]
    const fileName = `${biz.id}-${Date.now()}.${ext}`

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    )
    const buffer = Buffer.from(await photoFile.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, buffer, { contentType: photoFile.type, upsert: true })

    if (uploadError) {
      return new Response(`Photo upload failed: ${uploadError.message}`, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName)
    photoUrl = publicUrl
  }

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

  // Admin updates by id only; owner updates with ownership check
  if (admin) {
    await db
      .update(businesses)
      .set({ name, description, phone, email, website, facebookUrl, googleMapsUrl, photoUrl, openStatus })
      .where(eq(businesses.id, biz.id))
  } else {
    await db
      .update(businesses)
      .set({ name, description, phone, email, website, facebookUrl, googleMapsUrl, photoUrl, openStatus })
      .where(and(eq(businesses.id, biz.id), eq(businesses.ownerId, session!.user!.id)))
  }

  const redirectTo = admin ? `/admin` : `/dashboard`
  return Response.redirect(new URL(redirectTo, request.url), 302)
}
