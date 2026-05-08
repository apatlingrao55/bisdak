'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
        color: '#71717A', fontSize: '18px', pointerEvents: 'none', lineHeight: 1,
      }}>
        🔍
      </span>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search Filipino businesses in NZ..."
        className="input-dark"
        style={{ paddingLeft: '48px', paddingRight: '120px', height: '56px', fontSize: '18px' }}
      />
      <button
        type="submit"
        className="btn-primary"
        style={{ position: 'absolute', right: '6px', top: '6px', height: '44px', padding: '0 20px', fontSize: '15px' }}
      >
        Search
      </button>
    </form>
  )
}
