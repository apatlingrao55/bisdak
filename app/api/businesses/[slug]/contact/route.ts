import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'

type Params = Promise<{ slug: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  // Middleware enforces the 1-min cap (key 'contact:min').
  // Route handler enforces the 1-hour cap (key 'contact:hour').
  const ip = ipFromRequest(request)
  const hour = await rateLimit({ ip, route: 'contact:hour', max: 60, windowSec: 3600 })
  if (!hour.ok) return new Response('Rate limited, try again later', { status: 429 })

  const { slug } = await params
  const [biz] = await db
    .select({ phone: businesses.phone, email: businesses.email })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)
  if (!biz) return new Response('Not found', { status: 404 })

  return Response.json({ phone: biz.phone, email: biz.email })
}
