import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { getJobIfOwner } from '@/lib/jobs/auth'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Sign in required', { status: 401 })

  const { id } = await params
  const existing = await getJobIfOwner(session.user.id, id)
  if (!existing) return new Response('Not found or not authorized', { status: 404 })

  await db
    .update(jobs)
    .set({ status: 'closed', closedAt: new Date() })
    .where(eq(jobs.id, id))

  return Response.redirect(new URL('/dashboard/jobs?closed=1', request.url), 303)
}
