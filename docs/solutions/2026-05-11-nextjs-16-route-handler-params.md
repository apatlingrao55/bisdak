---
title: Next.js 16 route handler typed params (Promise pattern)
date: 2026-05-11
tags: [nextjs, app-router, route-handler, typescript]
related: [app/api/admin, AGENTS.md]
---

# Next.js 16 route handler typed params

## Problem

`AGENTS.md` warns: "this is NOT the Next.js you know — read
`node_modules/next/dist/docs/` before writing app code." Writing route
handlers from training-data muscle memory yields the *old* synchronous
`{ params: { id } }` shape, which is rejected by Next 16's typegen.

## Why

In the App Router as of Next 15+, dynamic route params are wrapped in a
`Promise` so the framework can defer resolution. You must `await` them.
Next 16 ships type generation (`next dev` / `next build` / `next typegen`)
that produces a global `RouteContext<'/path/[id]'>` generic.

## Pattern bisdak uses

The codebase has settled on a manual `Promise<{}>` type alias rather than
the generated `RouteContext`. Match the existing pattern when adding new
route handlers under `app/api/`:

```ts
// app/api/admin/posts/[id]/publish/route.ts
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
  const { id } = await params         // ← MUST await
  // …
  revalidatePath('/blog')             // works in route handlers
  return NextResponse.json({ ok: true })
}
```

Page components (server components) use the same Promise shape:

```ts
type Props = { params: Promise<{ slug: string }> }
export default async function Page({ params }: Props) {
  const { slug } = await params
  // …
}
```

## Cache model

bisdak is on the **previous** ISR caching model (`export const revalidate
= 300`), not Cache Components (`cacheComponents: true` in
`next.config.ts`). That means:

- `revalidatePath` from `next/cache` is the right invalidation tool
- Don't reach for `cacheLife` / `cacheTag` / `revalidateTag` / `updateTag`
  — those are Cache Components APIs and won't behave intuitively here

## Related

- `AGENTS.md` — the "NOT the Next.js you know" warning
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`
- `app/api/admin/businesses/[id]/premium/route.ts` — established codebase pattern
- `app/blog/[slug]/page.tsx` — same Promise pattern for server pages
