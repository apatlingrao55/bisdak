import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'

export async function POST(req: NextRequest) {
  const data = await req.formData()
  const token = data.get('token') as string

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const title = (data.get('title') as string)?.trim()
  const slug = (data.get('slug') as string)?.trim()
  const excerpt = (data.get('excerpt') as string)?.trim()
  const content = (data.get('content') as string)?.trim()
  const authorName = (data.get('authorName') as string)?.trim() || 'BisDak Team'

  if (!title || !slug || !excerpt || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
  }

  await db.insert(posts).values({ title, slug, excerpt, content, authorName, status: 'published' })

  return NextResponse.redirect(new URL(`/admin?token=${token}`, req.url))
}
