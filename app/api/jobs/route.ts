import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { auth } from '@/auth'
import { userOwnsBusiness } from '@/lib/jobs/auth'
import { parseJobInput } from '@/lib/jobs/validate'
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Sign in required', { status: 401 })
  }

  const ip = ipFromRequest(request)
  const rl = await rateLimit({ ip, route: 'jobs:create', max: 10, windowSec: 3600 })
  if (!rl.ok) return new Response('Rate limited, try again later', { status: 429 })

  const formData = await request.formData()
  const parsed = parseJobInput(formData)
  if (!parsed.ok) {
    return new Response(parsed.error, { status: 400 })
  }

  const owns = await userOwnsBusiness(session.user.id, parsed.data.businessId)
  if (!owns) {
    return new Response('Not authorized for this business', { status: 403 })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + SIXTY_DAYS_MS)

  const [created] = await db
    .insert(jobs)
    .values({
      businessId: parsed.data.businessId,
      title: parsed.data.title,
      description: parsed.data.description,
      employmentType: parsed.data.employmentType,
      applyUrl: parsed.data.applyUrl,
      applyEmail: parsed.data.applyEmail,
      salary: parsed.data.salary,
      status: 'open',
      postedAt: now,
      expiresAt,
    })
    .returning({ id: jobs.id })

  return Response.redirect(new URL(`/jobs/${created.id}?created=1`, request.url), 303)
}
