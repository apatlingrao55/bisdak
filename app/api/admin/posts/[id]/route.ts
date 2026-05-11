import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isAdmin } from '@/lib/admin'

type Params = Promise<{ id: string }>

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as {
    title?: string
    excerpt?: string
    content?: string
  }

  const patch: { title?: string; excerpt?: string; content?: string } = {}
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim()
  if (typeof body.excerpt === 'string' && body.excerpt.trim()) patch.excerpt = body.excerpt.trim()
  if (typeof body.content === 'string' && body.content.trim()) patch.content = body.content.trim()

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.update(posts).set(patch).where(eq(posts.id, id))

  if (existing.status === 'published') {
    revalidatePath('/blog')
    revalidatePath(`/blog/${existing.slug}`)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(posts).where(eq(posts.id, id))

  if (existing.status === 'published') {
    revalidatePath('/blog')
    revalidatePath(`/blog/${existing.slug}`)
  }

  return NextResponse.json({ ok: true })
}
