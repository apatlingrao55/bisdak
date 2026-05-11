import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { notifyAdmin } from '@/lib/notify'
import { slugify } from '@/lib/slugify'
import { rateLimit } from '@/lib/rate-limit'
import { ipFromRequest } from '@/lib/request'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request)
  const rl = await rateLimit({ ip, route: 'submit', max: 5, windowSec: 3600 })
  if (!rl.ok) return new Response('Rate limited, try again later', { status: 429 })

  const formData = await request.formData()
  const name = (formData.get('name') as string)?.trim()
  const categoryId = formData.get('categoryId') ? parseInt(formData.get('categoryId') as string) : null
  const regionId = formData.get('regionId') ? parseInt(formData.get('regionId') as string) : null
  const phone = (formData.get('phone') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const submitterEmail = (formData.get('submitterEmail') as string)?.trim() || null

  if (!name) {
    return new Response('Business name is required', { status: 400 })
  }

  await db.insert(submissions).values({
    name: name.slice(0, 200),
    slug: slugify(name),
    categoryId,
    regionId,
    phone,
    website,
    description: description?.slice(0, 200) ?? null,
    submitterEmail,
    status: 'pending',
  })

  notifyAdmin(
    'New Business Submission',
    `<p><strong>${escapeHtml(name)}</strong> was submitted for review.</p>
     <p>${[phone, website, submitterEmail].filter(Boolean).map(s => escapeHtml(s!)).join(' · ')}</p>
     ${description ? `<p>${escapeHtml(description)}</p>` : ''}
     <p><a href="https://bisdak.co.nz/admin">Review in admin panel</a></p>`
  )

  return Response.redirect(new URL('/submit?success=1', request.url))
}
