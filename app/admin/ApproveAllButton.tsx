'use client'

export default function ApproveAllButton({ count }: { count: number }) {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm(`Approve all ${count} pending submissions and publish them as live listings?`)) {
      e.preventDefault()
    }
  }

  return (
    <form action="/api/admin/submissions/approve-all" method="POST" onSubmit={handleSubmit}>
      <button
        type="submit"
        style={{
          background: '#36F4A4',
          color: '#000',
          border: 'none',
          borderRadius: '9999px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ✓ Approve All ({count})
      </button>
    </form>
  )
}
