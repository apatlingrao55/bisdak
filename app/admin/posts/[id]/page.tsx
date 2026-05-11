export const dynamic = 'force-dynamic'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { isAdmin } from '@/lib/admin'
import { renderContent } from '@/lib/blog-renderer'
import Actions from './Actions'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ error?: string }>

type PostMeta = {
  source?: string
  source_urls?: string[]
  topic_score?: number
  draft_model?: string
  review_model?: string
  review_revisions?: number
  generated_at?: string
  risk_flags?: string[]
  [key: string]: unknown
}

export default async function AdminPostReviewPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams
  const authed = await isAdmin()

  if (!authed) {
    return (
      <main>
        <Nav />
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '360px', padding: '0 24px' }}>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 400, margin: '0 0 8px', textAlign: 'center' }}>Admin</h1>
            <p style={{ color: '#52525B', fontSize: '14px', textAlign: 'center', margin: '0 0 32px' }}>Sign in to review this post.</p>
            {sp.error && (
              <p style={{ color: '#F87171', fontSize: '14px', textAlign: 'center', margin: '0 0 16px' }}>Invalid token. Try again.</p>
            )}
            <form action="/api/admin/login" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                name="token"
                type="password"
                placeholder="Admin token"
                required
                autoFocus
                className="input-dark"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                Sign in
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
  if (!post) notFound()

  const meta = (post.meta as PostMeta | null) ?? null
  const status = (post.status ?? 'draft') as 'draft' | 'published'

  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000000' }}>

        {/* Header */}
        <section style={{ background: '#061A1C', padding: '40px 24px 32px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Link href="/admin" style={{ color: '#36F4A4', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
              ← Back to admin
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ display: 'inline-block', fontSize: '11px', padding: '2px 10px', borderRadius: '9999px', background: status === 'published' ? 'rgba(54,244,164,0.1)' : 'rgba(113,113,122,0.2)', color: status === 'published' ? '#36F4A4' : '#71717A' }}>
                {status}
              </span>
              <span style={{ color: '#52525B', fontSize: '13px' }}>
                {post.authorName} · {post.createdAt ? new Date(post.createdAt).toLocaleString('en-NZ') : ''}
              </span>
            </div>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, lineHeight: 1.1, margin: '0 0 12px' }}>
              {post.title}
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: '15px', margin: '0 0 8px', lineHeight: 1.5 }}>
              {post.excerpt}
            </p>
            <p style={{ color: '#52525B', fontSize: '12px', margin: 0, fontFamily: 'monospace' }}>
              /blog/{post.slug}
            </p>
          </div>
        </section>

        {/* Actions */}
        <section style={{ padding: '24px', borderBottom: '1px solid #1E2C31' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Actions
              postId={post.id}
              slug={post.slug}
              status={status}
              initialTitle={post.title}
              initialExcerpt={post.excerpt}
              initialContent={post.content}
            />
          </div>
        </section>

        {/* Provenance */}
        {meta && (
          <section style={{ padding: '32px 24px', borderBottom: '1px solid #1E2C31' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <p style={{ color: '#36F4A4', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500, margin: '0 0 16px' }}>
                Provenance
              </p>
              <div style={{ background: '#02090A', border: '1px solid #1E2C31', borderRadius: '12px', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {meta.source && <Field label="Source" value={meta.source} />}
                {meta.draft_model && <Field label="Draft model" value={meta.draft_model} />}
                {meta.review_model && <Field label="Review model" value={meta.review_model} />}
                {typeof meta.topic_score === 'number' && <Field label="Topic score" value={String(meta.topic_score)} />}
                {typeof meta.review_revisions === 'number' && <Field label="Revisions" value={String(meta.review_revisions)} />}
                {meta.generated_at && <Field label="Generated at" value={new Date(meta.generated_at).toLocaleString('en-NZ')} />}
              </div>
              {meta.source_urls && meta.source_urls.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: '#71717A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Source URLs</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#A1A1AA', fontSize: '14px', lineHeight: 1.7 }}>
                    {meta.source_urls.map((u, i) => (
                      <li key={i}>
                        <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: '#36F4A4', textDecoration: 'none' }}>
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {meta.risk_flags && meta.risk_flags.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: '#71717A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Risk flags</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {meta.risk_flags.map((f, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Body preview — same renderer as public blog */}
        <section style={{ padding: '40px 24px 80px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <p style={{ color: '#36F4A4', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500, margin: '0 0 24px' }}>
              Preview (renders exactly as on /blog)
            </p>
            {renderContent(post.content)}
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ color: '#71717A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: '#ffffff', fontSize: '14px', margin: 0, wordBreak: 'break-word' }}>{value}</p>
    </div>
  )
}
