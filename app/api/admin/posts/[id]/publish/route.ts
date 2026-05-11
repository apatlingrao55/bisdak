import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isAdmin } from '@/lib/admin'

type Params = Promise<{ id: string }>

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(posts)
    .set({ status: 'published', publishedAt: new Date() })
    .where(eq(posts.id, id))

  revalidatePath('/blog')
  revalidatePath(`/blog/${post.slug}`)

  return NextResponse.json({ ok: true, url: `/blog/${post.slug}` })
}
