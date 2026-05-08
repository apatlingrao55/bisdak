import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { submissions, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

function isAuthorized(req: NextRequest, token?: string): boolean {
  const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()
  if (!adminToken) return false
  const cookieToken = req.cookies.get('admin_session')?.value ?? ''
  if (cookieToken === adminToken) return true
  return (token ?? '').trim() === adminToken
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now()
}

async function processApproval(subId: string, status: string, req: NextRequest, redirectUrl: URL | null, token?: string) {
  if (!isAuthorized(req, token)) {
    if (redirectUrl) return Response.redirect(new URL('/admin?error=unauthorized', req.url))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['approved', 'rejected'].includes(status)) {
    if (redirectUrl) return Response.redirect(new URL('/admin?error=invalid', req.url))
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const [sub] = await db.select().from(submissions).where(eq(submissions.id, subId)).limit(1)
  if (!sub) {
    if (redirectUrl) return Response.redirect(new URL('/admin?error=not-found', req.url))
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await db.update(submissions).set({ status: status as 'approved' | 'rejected' }).where(eq(submissions.id, subId))

  if (status === 'approved') {
    await db.insert(businesses).values({
      name: sub.name,
      slug: slugify(sub.name),
      categoryId: sub.categoryId,
      regionId: sub.regionId,
      description: sub.description,
      phone: sub.phone,
      website: sub.website,
      facebookUrl: sub.facebookUrl,
      googleMapsUrl: sub.googleMapsUrl,
      isFilipino: true,
      status: 'active',
    })
  }

  if (redirectUrl) return Response.redirect(redirectUrl)
  return Response.json({ success: true })
}

// JSON PATCH from API clients
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  return processApproval(id, body.status ?? '', request, null, body.token)
}

// Form POST from admin page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const formData = await request.formData()
  const status = formData.get('status') as string ?? ''
  const redirectUrl = new URL('/admin', request.url)
  return processApproval(id, status, request, redirectUrl)
}
