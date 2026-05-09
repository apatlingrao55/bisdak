import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { submissions, businesses } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { isAdmin } from '@/lib/admin'
import { slugify } from '@/lib/slugify'

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL('/admin?error=unauthorized', req.url))
  }

  const pending = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, 'pending'))

  if (pending.length === 0) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // Bulk insert into businesses — unique slug per submission using its ID prefix
  const rows = pending.map(sub => ({
    name: sub.name,
    slug: slugify(sub.name, sub.id.slice(0, 8)),
    categoryId: sub.categoryId,
    regionId: sub.regionId,
    description: sub.description,
    phone: sub.phone,
    website: sub.website,
    facebookUrl: sub.facebookUrl,
    googleMapsUrl: sub.googleMapsUrl,
    isFilipino: true as const,
    status: 'active' as const,
  }))

  // Insert in chunks of 100 to stay within statement size limits
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(businesses).values(rows.slice(i, i + 100))
  }

  // Mark all as approved in one query
  const ids = pending.map(s => s.id)
  await db
    .update(submissions)
    .set({ status: 'approved' })
    .where(inArray(submissions.id, ids))

  return NextResponse.redirect(new URL('/admin', req.url))
}
