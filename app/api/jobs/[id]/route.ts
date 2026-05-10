import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { getJobIfOwner } from '@/lib/jobs/auth'
import { parseJobInput } from '@/lib/jobs/validate'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  // HTML forms only emit GET/POST. We treat POST to this route as "update".
  const session = await auth()
  if (!session?.user?.id) return new Response('Sign in required', { status: 401 })

  const { id } = await params
  const existing = await getJobIfOwner(session.user.id, id)
  if (!existing) return new Response('Not found or not authorized', { status: 404 })

  const formData = await request.formData()
  // Force the businessId on the existing job — never trust the client to change ownership.
  formData.set('businessId', existing.businessId)
  const parsed = parseJobInput(formData)
  if (!parsed.ok) return new Response(parsed.error, { status: 400 })

  await db
    .update(jobs)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      employmentType: parsed.data.employmentType,
      applyUrl: parsed.data.applyUrl,
      applyEmail: parsed.data.applyEmail,
      salary: parsed.data.salary,
    })
    .where(eq(jobs.id, id))

  return Response.redirect(new URL(`/jobs/${id}?updated=1`, request.url), 303)
}
