'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  postId: string
  slug: string
  status: 'draft' | 'published'
  initialTitle: string
  initialExcerpt: string
  initialContent: string
}

export default function Actions({
  postId,
  slug,
  status,
  initialTitle,
  initialExcerpt,
  initialContent,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [excerpt, setExcerpt] = useState(initialExcerpt)
  const [content, setContent] = useState(initialContent)

  const doFetch = async (path: string, init?: RequestInit) => {
    setError(null)
    const res = await fetch(path, init)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Request failed: ${res.status}`)
    }
    return res.json()
  }

  const onPublish = () =>
    startTransition(async () => {
      try {
        await doFetch(`/api/admin/posts/${postId}/publish`, { method: 'POST' })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Publish failed')
      }
    })

  const onUnpublish = () =>
    startTransition(async () => {
      try {
        await doFetch(`/api/admin/posts/${postId}/unpublish`, { method: 'POST' })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unpublish failed')
      }
    })

  const onSave = () =>
    startTransition(async () => {
      try {
        await doFetch(`/api/admin/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, excerpt, content }),
        })
        setMode('view')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
      }
    })

  const onDelete = () =>
    startTransition(async () => {
      try {
        await doFetch(`/api/admin/posts/${postId}`, { method: 'DELETE' })
        router.push('/admin')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed')
      }
    })

  const onCancelEdit = () => {
    setTitle(initialTitle)
    setExcerpt(initialExcerpt)
    setContent(initialContent)
    setError(null)
    setMode('view')
  }

  const btnPrimary = {
    background: '#36F4A4',
    color: '#000000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  } as const
  const btnGhost = {
    background: 'transparent',
    color: '#A1A1AA',
    border: '1px solid #1E2C31',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
  } as const
  const btnDanger = {
    background: 'transparent',
    color: '#F87171',
    border: '1px solid #4B1F1F',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
  } as const

  if (mode === 'edit') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ color: '#71717A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-dark"
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <label style={{ color: '#71717A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Excerpt</label>
        <input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="input-dark"
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <label style={{ color: '#71717A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={24}
          className="input-dark"
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.5 }}
        />
        {error && <p style={{ color: '#F87171', fontSize: '14px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={onSave} disabled={isPending} style={btnPrimary}>
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={onCancelEdit} disabled={isPending} style={btnGhost}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: '#F87171', fontSize: '14px', margin: 0 }}>
          Hard-delete this post? This cannot be undone.
        </p>
        {error && <p style={{ color: '#F87171', fontSize: '14px', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={onDelete} disabled={isPending} style={btnDanger}>
            {isPending ? 'Deleting…' : 'Yes, delete permanently'}
          </button>
          <button onClick={() => { setError(null); setMode('view') }} disabled={isPending} style={btnGhost}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && <p style={{ color: '#F87171', fontSize: '14px', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {status === 'draft' ? (
          <button onClick={onPublish} disabled={isPending} style={btnPrimary}>
            {isPending ? 'Publishing…' : 'Publish'}
          </button>
        ) : (
          <button onClick={onUnpublish} disabled={isPending} style={btnGhost}>
            {isPending ? 'Unpublishing…' : 'Move to draft'}
          </button>
        )}
        <button onClick={() => setMode('edit')} disabled={isPending} style={btnGhost}>
          Edit
        </button>
        <button onClick={() => setMode('confirm-delete')} disabled={isPending} style={btnDanger}>
          Delete
        </button>
        {status === 'published' && (
          <a
            href={`/blog/${slug}`}
            target="_blank"
            rel="noopener"
            style={{ ...btnGhost, textDecoration: 'none', display: 'inline-block' }}
          >
            View live →
          </a>
        )}
      </div>
    </div>
  )
}
