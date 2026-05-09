import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { notifyAdmin } from '@/lib/notify'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now()
}

export async function POST(request: NextRequest) {
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
    `<p><strong>${name}</strong> was submitted for review.</p>
     <p>${[phone, website, submitterEmail].filter(Boolean).join(' · ')}</p>
     ${description ? `<p>${description}</p>` : ''}
     <p><a href="https://bisdak.co.nz/admin">Review in admin panel</a></p>`
  )

  return Response.redirect(new URL('/submit?success=1', request.url))
}
